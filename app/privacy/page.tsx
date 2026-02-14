import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="glass-panel rounded-xl p-8 space-y-6 relative">
        <Link 
          href="/login"
          className="absolute top-8 right-8 text-sm text-muted-foreground hover:text-white flex items-center gap-2 transition-colors border border-white/10 rounded-lg px-3 py-1.5 bg-white/5 hover:bg-white/10"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          Close
        </Link>

        <h1 className="text-3xl font-bold text-white mb-8 pr-12">Privacy Policy</h1>
        
        <div className="space-y-4 text-muted-foreground text-sm leading-relaxed">
          <p>Last updated: {new Date().toLocaleDateString()}</p>
          
          <h2 className="text-xl font-semibold text-white mt-8 mb-4">1. Information We Collect</h2>
          <p>
            When you use our PRL Automated service ("Service"), we collect minimal information necessary strictly to provide you with our automation features. This includes:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Google Account information (email, profile) for authentication via Google OAuth.</li>
            <li>Access to specific Google Sheets and Drive files that you authorize, strictly for the purpose of reading source data (Pre Registered List) and writing verification results.</li>
            <li>Configuration data for your sync jobs (e.g., spreadsheet IDs, job settings).</li>
          </ul>
          <p className="mt-2 text-primary">
            **We do not store, sell, or analyze your spreadsheet content.** The data is processed in-transit solely to perform the verification logic you requested and is written back to your own Google Sheet.
          </p>

          <h2 className="text-xl font-semibold text-white mt-8 mb-4">2. How We Use Your Information</h2>
          <p>We use the collected information solely for the following specific purposes:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>To authenticate your identity and provide secure access to the Service.</li>
            <li>To execute the automated verification of Mobile Legends: Bang Bang (MLBB) player registrations as configured by you.</li>
            <li>To read your source registration list and populate your target verification sheet without manual copy-pasting.</li>
          </ul>
          <p>We do not sell, rent, or share your personal information with third parties for marketing purposes.</p>

          <h2 className="text-xl font-semibold text-white mt-8 mb-4">3. Data Security</h2>
          <p>
            We implement industry-standard security measures to protect your data. OAuth tokens are encrypted, and access to your Google Drive files is limited strictly to the scopes you authorize.
          </p>

          <h2 className="text-xl font-semibold text-white mt-8 mb-4">4. Google User Data</h2>
          <p>
            Our Service's use and transfer to any other app of information received from Google APIs will adhere to the <a href="https://developers.google.com/terms/api-services-user-data-policy" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">Google API Services User Data Policy</a>, including the Limited Use requirements.
          </p>

          <h2 className="text-xl font-semibold text-white mt-8 mb-4">5. Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy, please contact us at support@prlautomated.com.
          </p>
        </div>
      </div>
    </div>
  );
}
