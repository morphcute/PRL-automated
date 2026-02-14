import Link from "next/link";

export default function TermsPage() {
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

        <h1 className="text-3xl font-bold text-white mb-8 pr-12">Terms of Service</h1>
        
        <div className="space-y-4 text-muted-foreground text-sm leading-relaxed">
          <p>Last updated: {new Date().toLocaleDateString()}</p>
          
          <h2 className="text-xl font-semibold text-white mt-8 mb-4">1. Acceptance of Terms</h2>
          <p>
            By accessing or using PRL Automated ("Service"), you agree to be bound by these Terms of Service. If you do not agree, please do not use our Service.
          </p>

          <h2 className="text-xl font-semibold text-white mt-8 mb-4">2. Description of Service</h2>
          <p>
            PRL Automated is a specialized tool designed to assist Mobile Legends: Bang Bang tournament organizers. It automates the process of fetching "Pre Registered Lists" from Google Sheets and verifying player registrations without manual data entry or external scripts.
          </p>
          <p className="mt-2">
            The Service operates by accessing your authorized Google Sheets to read player data, verifying it against public game data, and writing the results back to your own spreadsheet.
          </p>

          <h2 className="text-xl font-semibold text-white mt-8 mb-4">3. User Responsibilities</h2>
          <p>You agree to:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Provide accurate and complete information when creating sync jobs.</li>
            <li>Maintain the confidentiality of your account credentials.</li>
            <li>Use the Service only for lawful purposes and in accordance with applicable laws.</li>
            <li>Not interfere with or disrupt the integrity or performance of the Service.</li>
          </ul>

          <h2 className="text-xl font-semibold text-white mt-8 mb-4">4. Intellectual Property</h2>
          <p>
            All content, features, and functionality of the Service are the exclusive property of PRL Automated and its licensors. You may not reproduce, modify, or distribute any part of the Service without our prior written consent.
          </p>

          <h2 className="text-xl font-semibold text-white mt-8 mb-4">5. Disclaimer of Warranties</h2>
          <p>
            The Service is provided on an "AS IS" and "AS AVAILABLE" basis. We make no warranties, express or implied, regarding the reliability, accuracy, or availability of the Service.
          </p>

          <h2 className="text-xl font-semibold text-white mt-8 mb-4">6. Limitation of Liability</h2>
          <p>
            In no event shall PRL Automated be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or in connection with your use of the Service.
          </p>

          <h2 className="text-xl font-semibold text-white mt-8 mb-4">7. Contact Us</h2>
          <p>
            If you have any questions about these Terms, please contact us at support@prlautomated.com.
          </p>
        </div>
      </div>
    </div>
  );
}
