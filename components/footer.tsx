export default function Footer() {
  return (
    <footer className="absolute bottom-0 w-full py-8 px-4 bg-white dark:bg-card text-brand-text-dark dark:text-brand-text-light border-t border-gray-200 dark:border-gray-700 mt-12">
      <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-center text-sm space-y-4 md:space-y-0">
        <p style={{ color: 'black'}}>&copy; {new Date().getFullYear()} PhotoEnhance. All rights reserved.</p>
        <nav className="space-x-4">
          <a href="#" className="hover:text-brand-primary transition-colors" style={{ color: 'black'}}>
            Privacy Policy
          </a>
          <a href="#" className="hover:text-brand-primary transition-colors" style={{ color: 'black'}}>
            Terms of Service
          </a>
          <a href="#" className="hover:text-brand-primary transition-colors" style={{ color: 'black'}}>
            Contact Us
          </a>
        </nav>
      </div>
    </footer>
  )
}
