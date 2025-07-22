"use client"

import type React from "react"
import { useState, useMemo, useEffect, useRef, useCallback } from "react"
import * as fal from "@fal-ai/serverless-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Slider } from "@/components/ui/slider" // Assuming shadcn/ui slider is available
import ImageCompareSlider from "@/components/image-compare-slider" // Import the new component
import Footer from "@/components/footer"
import {
  Loader2,
  ImageIcon,
  Lightbulb,
  CheckCircle,
  Upload,
  Sparkles,
  Edit,
  ArrowRight,
  ArrowLeft,
  User,
  Move,
  Trash2,
} from "lucide-react"
import { cn } from "@/lib/utils" // Assuming cn utility is available

// Configure Fal AI proxy
fal.config({
  proxyUrl: "/api/fal/proxy",
})

type ImageResult = {
  url: string
  file_name: string
  file_size: number
}

type FalResult = {
  images: ImageResult[]
}

export default function ImageTransformationPage() {
  const [prompt, setPrompt] = useState<string>(
    "A person standing in front of the Eiffel Tower, wearing a red shirt, sunny day, realistic style, highly detailed, vibrant colors",
  )
  const [originalImageFile, setOriginalImageFile] = useState<File | null>(null)
  const [originalImagePreview, setOriginalImagePreview] = useState<string | null>(null)
  const [enhancedImageBase64, setEnhancedImageBase64] = useState<string | null>(null)
  const [brightness, setBrightness] = useState(100) // 0-200%
  const [contrast, setContrast] = useState(100) // 0-200%
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [result, setResult] = useState<FalResult | null>(null)
  const [activeTab, setActiveTab] = useState("step-1")
  const [isDragging, setIsDragging] = useState(false)

  // Conceptual ControlNet settings (for UI display only)
  const [faceControlWeight, setFaceControlWeight] = useState(1.0)
  const [faceStartStep, setFaceStartStep] = useState(0.0)
  const [faceEndStep, setFaceEndStep] = useState(1.0)

  const [poseControlWeight, setPoseControlWeight] = useState(1.0)
  const [poseStartStep, setPoseStartStep] = useState(0.25)
  const [poseEndStep, setPoseEndStep] = useState(0.8)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const generatedImage = useMemo(() => {
    if (!result) {
      return null
    }
    return result.images[0]
  }, [result])

  // Effect to load original image into preview
  useEffect(() => {
    if (originalImageFile) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setOriginalImagePreview(reader.result as string)
      }
      reader.readAsDataURL(originalImageFile)
    } else {
      setOriginalImagePreview(null)
      setEnhancedImageBase64(null)
    }
  }, [originalImageFile])

  // Effect to apply filters whenever original image or filter settings change
  useEffect(() => {
    if (originalImagePreview && canvasRef.current) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext("2d")
      const img = new Image()
      img.crossOrigin = "anonymous" // Set crossOrigin for CORS if images are from different origins
      img.src = originalImagePreview
      img.onload = () => {
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        ctx?.clearRect(0, 0, canvas.width, canvas.height)
        // Apply filters using CSS filter syntax on canvas context
        if (ctx) {
          ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`
          ctx.drawImage(img, 0, 0)
        }
        setEnhancedImageBase64(canvas.toDataURL("image/png")) // Get base64 of enhanced image
      }
      img.onerror = (err) => {
        console.error("Error loading image for canvas:", err)
        setError(new Error("Failed to load image for enhancement. Please try another image."))
        setEnhancedImageBase64(null)
      }
    } else {
      setEnhancedImageBase64(null)
    }
  }, [originalImagePreview, brightness, contrast])

  const handleFileChange = useCallback((file: File | null) => {
    if (file && file.type.startsWith("image/")) {
      setOriginalImageFile(file) // Set original file
      setError(null)
      setBrightness(100) // Reset filters
      setContrast(100) // Reset filters
    } else if (file) {
      setError(new Error("Please upload a valid image file (e.g., JPG, PNG)."))
      setOriginalImageFile(null)
    } else {
      setOriginalImageFile(null)
    }
  }, [])

  const handleImageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileChange(e.target.files ? e.target.files[0] : null)
  }

  const handleSelectImageClick = () => {
    fileInputRef.current?.click()
  }

  const handleDeletePhoto = () => {
    setOriginalImageFile(null)
    setOriginalImagePreview(null)
    setEnhancedImageBase64(null)
    setBrightness(100)
    setContrast(100)
    if (fileInputRef.current) {
      fileInputRef.current.value = "" // Clear the file input
    }
    setError(null)
  }

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFileChange(e.dataTransfer.files[0])
      }
    },
    [handleFileChange],
  )

  const generateImage = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    if (!enhancedImageBase64) {
      setError(new Error("Please upload and enhance an image in Step 1 to generate."))
      setLoading(false)
      return
    }
    if (!prompt.trim()) {
      setError(new Error("Please provide a prompt in Step 3."))
      setLoading(false)
      return
    }

    try {
      const falResult: FalResult = await fal.subscribe("fal-ai/flux-pro/kontext", {
        input: {
          prompt,
          image_url: enhancedImageBase64, // Send the client-side enhanced image
        },
      })
      setResult(falResult)
    } catch (err: any) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  const isStep1Complete = !!enhancedImageBase64 // Step 1 is complete when enhanced image is ready
  const isStep2Complete = true // ControlNet step is always "complete" as it's conceptual configuration
  const isStep3Complete = !!prompt.trim()
  const isStep4Complete = !!generatedImage || loading

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-purple-900 via-indigo-900 to-gray-900 p-4 text-gray-100">
      <Card className="w-full max-w-3xl bg-gray-800/70 backdrop-blur-sm border border-gray-700 shadow-xl">
        <CardHeader className="pb-4">
          <CardTitle className="text-center text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
            Enchanting Image Weaver
          </CardTitle>
          <p className="text-center text-sm text-gray-400">Transform your photos with AI magic, step by step.</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-gray-700/50 rounded-lg p-1">
              <TabsTrigger
                value="step-1"
                className={cn(
                  "data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:shadow-md",
                  "text-gray-300 hover:text-white transition-colors duration-200",
                )}
              >
                <span className="flex items-center gap-2">
                  Step 1: Photo
                  {isStep1Complete && <CheckCircle className="h-4 w-4 text-green-400" />}
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="step-2"
                className={cn(
                  "data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:shadow-md",
                  "text-gray-300 hover:text-white transition-colors duration-200",
                )}
              >
                <span className="flex items-center gap-2">
                  Step 2: ControlNet
                  {isStep2Complete && <CheckCircle className="h-4 w-4 text-green-400" />}
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="step-3"
                className={cn(
                  "data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:shadow-md",
                  "text-gray-300 hover:text-white transition-colors duration-200",
                )}
              >
                <span className="flex items-center gap-2">
                  Step 3: Prompt
                  {isStep3Complete && <CheckCircle className="h-4 w-4 text-green-400" />}
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="step-4"
                className={cn(
                  "data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:shadow-md",
                  "text-gray-300 hover:text-white transition-colors duration-200",
                )}
              >
                <span className="flex items-center gap-2">
                  Step 4: Generate
                  {isStep4Complete && <Sparkles className="h-4 w-4 text-yellow-400" />}
                </span>
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="step-1"
              className="space-y-6 p-4 bg-gray-800/50 rounded-b-lg border border-t-0 border-gray-700"
            >
              <h3 className="text-xl font-semibold text-purple-300 flex items-center gap-2">
                <Upload className="h-5 w-5" /> Step 1: Prepare Your Photo
              </h3>
              <p className="text-sm text-gray-400 flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-yellow-300" />
                Upload your original photo and optionally enhance it with brightness/contrast.
              </p>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                  "relative border-2 border-dashed rounded-lg p-6 text-center transition-colors duration-200",
                  isDragging ? "border-purple-500 bg-purple-900/20" : "border-gray-600 bg-gray-700/30",
                )}
              >
                <Input
                  ref={fileInputRef}
                  id="input-image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageInputChange}
                  className="hidden" // Hide the default input
                />
                <div className="flex flex-col items-center justify-center space-y-3">
                  <ImageIcon className="h-12 w-12 text-gray-400" />
                  <p className="text-gray-300">Drag & Drop your image here, or</p>
                  <Button
                    onClick={handleSelectImageClick}
                    className="bg-purple-600 hover:bg-purple-700 text-white transition-colors duration-200 flex items-center gap-2"
                  >
                    <Upload className="h-5 w-5" /> Choose File
                  </Button>
                </div>
                {originalImageFile && (
                  <div className="mt-4 flex flex-col items-center gap-2">
                    <div className="text-sm text-gray-400 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-400" />
                      Selected: {originalImageFile.name} ({Math.round(originalImageFile.size / 1024)} KB)
                    </div>
                    <Button
                      onClick={handleDeletePhoto}
                      variant="destructive"
                      size="sm"
                      className="mt-2 flex items-center gap-1"
                    >
                      <Trash2 className="h-4 w-4" /> Delete Photo
                    </Button>
                  </div>
                )}
              </div>

              {originalImagePreview && (
                <div className="mt-6 flex justify-center">
                  {originalImagePreview && enhancedImageBase64 && (
                    <ImageCompareSlider
                      beforeImageSrc={originalImagePreview}
                      afterImageSrc={enhancedImageBase64}
                      width={500} // Adjust as needed
                      height={300} // Adjust as needed
                    />
                  )}
                  {/* Hidden canvas for image processing */}
                  <canvas ref={canvasRef} className="hidden" />
                </div>
              )}
              {error && <div className="text-red-400 text-center mt-4 font-medium">{error.message}</div>}

              <Button
                onClick={() => setActiveTab("step-2")}
                disabled={!isStep1Complete}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white transition-colors duration-200 flex items-center gap-2"
              >
                Next: ControlNet Setup <ArrowRight className="h-4 w-4" />
              </Button>
            </TabsContent>

            <TabsContent
              value="step-2"
              className="space-y-6 p-4 bg-gray-800/50 rounded-b-lg border border-t-0 border-gray-700"
            >
              <h3 className="text-xl font-semibold text-purple-300 flex items-center gap-2">
                <Move className="h-5 w-5" /> Step 2: Set Up ControlNet (Conceptual)
              </h3>
              <p className="text-sm text-gray-400 flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-yellow-300" />
                These settings conceptually guide the AI to preserve the face and adjust the pose.
                <span className="font-bold text-red-300">
                  Note: The current AI model interprets these implicitly from your prompt and image. For explicit
                  ControlNet control, a different AI setup is required.
                </span>
              </p>

              <div className="grid gap-6">
                {/* IP-adapter face */}
                <div className="bg-gray-700/30 p-4 rounded-lg border border-gray-600">
                  <h4 className="font-semibold mb-3 text-purple-200 flex items-center gap-2">
                    <User className="h-4 w-4" /> Unit 0: IP-adapter Face
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-400">Control Type</Label>
                      <Input value="IP-adapter" readOnly className="bg-gray-700/50 border-gray-600 text-gray-300" />
                    </div>
                    <div>
                      <Label className="text-gray-400">Model</Label>
                      <Input
                        value="ip-adapter-plus-face_sd15"
                        readOnly
                        className="bg-gray-700/50 border-gray-600 text-gray-300"
                      />
                    </div>
                    <div>
                      <Label htmlFor="face-weight" className="text-gray-400">
                        Control Weight
                      </Label>
                      <Input
                        id="face-weight"
                        type="number"
                        step="0.1"
                        min="0"
                        max="2"
                        value={faceControlWeight}
                        onChange={(e) => setFaceControlWeight(Number.parseFloat(e.target.value))}
                        className="bg-gray-700/30 border-gray-600 text-gray-200"
                      />
                    </div>
                    <div>
                      <Label htmlFor="face-start" className="text-gray-400">
                        Starting Control Step
                      </Label>
                      <Input
                        id="face-start"
                        type="number"
                        step="0.05"
                        min="0"
                        max="1"
                        value={faceStartStep}
                        onChange={(e) => setFaceStartStep(Number.parseFloat(e.target.value))}
                        className="bg-gray-700/30 border-gray-600 text-gray-200"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="face-end" className="text-gray-400">
                        Ending Control Step
                      </Label>
                      <Input
                        id="face-end"
                        type="number"
                        step="0.05"
                        min="0"
                        max="1"
                        value={faceEndStep}
                        onChange={(e) => setFaceEndStep(Number.parseFloat(e.target.value))}
                        className="bg-gray-700/30 border-gray-600 text-gray-200"
                      />
                    </div>
                  </div>
                </div>

                {/* OpenPose */}
                <div className="bg-gray-700/30 p-4 rounded-lg border border-gray-600">
                  <h4 className="font-semibold mb-3 text-purple-200 flex items-center gap-2">
                    <Move className="h-4 w-4" /> Unit 1: OpenPose
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-400">Control Type</Label>
                      <Input value="OpenPose" readOnly className="bg-gray-700/50 border-gray-600 text-gray-300" />
                    </div>
                    <div>
                      <Label className="text-gray-400">Model</Label>
                      <Input
                        value="control_sd15_openpose"
                        readOnly
                        className="bg-gray-700/50 border-gray-600 text-gray-300"
                      />
                    </div>
                    <div>
                      <Label htmlFor="pose-weight" className="text-gray-400">
                        Control Weight
                      </Label>
                      <Input
                        id="pose-weight"
                        type="number"
                        step="0.1"
                        min="0"
                        max="2"
                        value={poseControlWeight}
                        onChange={(e) => setPoseControlWeight(Number.parseFloat(e.target.value))}
                        className="bg-gray-700/30 border-gray-600 text-gray-200"
                      />
                    </div>
                    <div>
                      <Label htmlFor="pose-start" className="text-gray-400">
                        Starting Control Step
                      </Label>
                      <Input
                        id="pose-start"
                        type="number"
                        step="0.05"
                        min="0"
                        max="1"
                        value={poseStartStep}
                        onChange={(e) => setPoseStartStep(Number.parseFloat(e.target.value))}
                        className="bg-gray-700/30 border-gray-600 text-gray-200"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="pose-end" className="text-gray-400">
                        Ending Control Step
                      </Label>
                      <Input
                        id="pose-end"
                        type="number"
                        step="0.05"
                        min="0"
                        max="1"
                        value={poseEndStep}
                        onChange={(e) => setPoseEndStep(Number.parseFloat(e.target.value))}
                        className="bg-gray-700/30 border-gray-600 text-gray-200"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => setActiveTab("step-1")}
                  className="w-full bg-gray-700 hover:bg-gray-600 text-gray-200 transition-colors duration-200 flex items-center gap-2"
                  variant="outline"
                >
                  <ArrowLeft className="h-4 w-4" /> Previous: Photo
                </Button>
                <Button
                  onClick={() => setActiveTab("step-3")}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white transition-colors duration-200 flex items-center gap-2"
                >
                  Next: Describe Scene <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </TabsContent>

            <TabsContent
              value="step-3"
              className="space-y-6 p-4 bg-gray-800/50 rounded-b-lg border border-t-0 border-gray-700"
            >
              <h3 className="text-xl font-semibold text-purple-300 flex items-center gap-2">
                <Edit className="h-5 w-5" /> Step 3: Craft Your Vision (Prompt)
              </h3>
              <p className="text-sm text-gray-400 flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-yellow-300" />
                Describe the new background and desired pose. Be specific about location, lighting, and clothing.
              </p>
              <div className="grid gap-3">
                <Label htmlFor="prompt" className="text-gray-300">
                  Prompt for New Background and Pose
                </Label>
                <Textarea
                  id="prompt"
                  placeholder="e.g., A person standing in front of the Eiffel Tower, wearing a red shirt, sunny day, realistic style, highly detailed, vibrant colors."
                  value={prompt}
                  onChange={(e) => {
                    setPrompt(e.target.value)
                    setError(null) // Clear error on new input
                  }}
                  rows={6}
                  className="bg-gray-700/30 border-gray-600 text-gray-200 placeholder:text-gray-500 focus:border-purple-500 focus:ring-purple-500"
                />
                {isStep3Complete && (
                  <div className="mt-2 text-sm text-gray-400 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    Prompt entered!
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setActiveTab("step-2")}
                  className="w-full bg-gray-700 hover:bg-gray-600 text-gray-200 transition-colors duration-200 flex items-center gap-2"
                  variant="outline"
                >
                  <ArrowLeft className="h-4 w-4" /> Previous: ControlNet
                </Button>
                <Button
                  onClick={() => setActiveTab("step-4")}
                  disabled={!isStep3Complete}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white transition-colors duration-200 flex items-center gap-2"
                >
                  Next: Generate Image <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </TabsContent>

            <TabsContent
              value="step-4"
              className="space-y-6 p-4 bg-gray-800/50 rounded-b-lg border border-t-0 border-gray-700"
            >
              <h3 className="text-xl font-semibold text-purple-300 flex items-center gap-2">
                <Sparkles className="h-5 w-5" /> Step 4: Unleash the Magic
              </h3>
              <p className="text-sm text-gray-400 flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-yellow-300" />
                Review your inputs and click 'Generate'. If the result isn't perfect, refine your prompt in Step 3.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-300">
                <div className="bg-gray-700/30 p-4 rounded-lg border border-gray-600">
                  <h4 className="font-semibold mb-2 text-purple-200">Your Input Image (Enhanced):</h4>
                  {enhancedImageBase64 ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={enhancedImageBase64 || "/placeholder.svg"}
                      alt="Input Preview"
                      className="max-w-full h-32 object-contain rounded-md mx-auto border border-gray-500"
                    />
                  ) : (
                    <div className="h-32 flex items-center justify-center text-gray-500">No image uploaded.</div>
                  )}
                </div>
                <div className="bg-gray-700/30 p-4 rounded-lg border border-gray-600">
                  <h4 className="font-semibold mb-2 text-purple-200">Your Prompt:</h4>
                  <p className="text-sm italic break-words">{prompt || "No prompt entered."}</p>
                </div>
              </div>

              <Button
                onClick={generateImage}
                disabled={loading || !isStep1Complete || !isStep3Complete}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white transition-all duration-300 flex items-center justify-center gap-2 text-lg font-semibold py-3"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Casting Spell...
                  </>
                ) : (
                  <>
                    Generate Transformed Image <Sparkles className="h-5 w-5" />
                  </>
                )}
              </Button>

              {error && <div className="text-red-400 text-center mt-4 font-medium">{error.message}</div>}

              {generatedImage && (
                <div className="mt-6 text-center">
                  <h3 className="text-xl font-semibold mb-4 text-purple-200">Compare Images:</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col items-center">
                      <p className="text-gray-400 mb-2">Original Photo</p>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={originalImagePreview || "/placeholder.svg"}
                        alt="Original Image"
                        className="max-w-full h-auto rounded-lg shadow-lg border border-gray-600"
                      />
                    </div>
                    <div className="flex flex-col items-center">
                      <p className="text-gray-400 mb-2">Transformed Photo</p>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={generatedImage.url || "/placeholder.svg"}
                        alt="Generated Image"
                        className="max-w-full h-auto rounded-lg shadow-lg border border-purple-500 animate-fade-in"
                      />
                    </div>
                  </div>
                  <p className="text-sm text-gray-400 mt-4">Image generated by Fal AI.</p>
                </div>
              )}

              {!generatedImage && !loading && (
                <div className="mt-6 text-center text-gray-500">
                  <ImageIcon className="mx-auto h-16 w-16 text-gray-600" />
                  <p className="mt-2">Your magical creation will appear here.</p>
                </div>
              )}
              <Button
                onClick={() => setActiveTab("step-3")}
                className="w-full bg-gray-700 hover:bg-gray-600 text-gray-200 transition-colors duration-200 flex items-center gap-2"
                variant="outline"
              >
                <ArrowLeft className="h-4 w-4" /> Back to Prompt
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      <Footer />
    </main>
  )
}
