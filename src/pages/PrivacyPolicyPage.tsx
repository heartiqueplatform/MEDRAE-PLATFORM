"use client";

import { useNavigate } from "react-router-dom";

export default function PrivacyPolicyPage() {
    const navigate = useNavigate();
    const currentYear = new Date().getFullYear();

    return (
        <div className="w-full min-h-screen bg-white text-gray-900 py-2 px-2  animate-fadeIn">
            <div className="max-w-4xl mx-auto space-y-2 text-sm text-gray-700">

                <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>

                <section className="space-y-1">

                    <h2 className="font-semibold text-xl">1. Information We Collect</h2>
                    <p>
                        Medrae collects information that you provide when creating an account, uploading content, or interacting with the platform. This includes:
                        <ul className="list-disc list-inside mt-1">
                            <li>Personal details such as name, email, and phone number</li>
                            <li>Profile information including educational background and study interests</li>
                            <li>Uploaded content such as notes, images, and marketplace listings</li>
                            <li>Usage data such as login times, features used, and interactions on the platform</li>
                        </ul>
                    </p>

                    <h2 className="font-semibold text-xl">2. How We Use Your Information</h2>
                    <p>
                        We use the information to:
                        <ul className="list-disc list-inside mt-1">
                            <li>Provide and improve platform services</li>
                            <li>Ensure a safe and secure environment for all users</li>
                            <li>Enable marketplace transactions between users</li>
                            <li>Communicate important updates, notifications, or announcements</li>
                            <li>Analyze usage trends to enhance learning resources and features</li>
                        </ul>
                    </p>

                    <h2 className="font-semibold text-xl">3. Data Sharing & Third Parties</h2>
                    <p>
                        Medrae does not sell your personal information. We may share data only when necessary for:
                        <ul className="list-disc list-inside mt-1">
                            <li>Facilitating marketplace transactions safely</li>
                            <li>Complying with legal obligations or government requests</li>
                            <li>Protecting the rights, safety, or property of Medrae and users</li>
                        </ul>
                        We may also use third-party services (e.g., hosting, analytics) that require limited access to your data under strict privacy terms.
                    </p>

                    <h2 className="font-semibold text-xl">4. Data Security</h2>
                    <p>
                        Medrae implements reasonable technical and organizational measures to protect user data against unauthorized access, alteration, disclosure, or destruction. However, no system is completely secure, and users are encouraged to exercise caution when sharing sensitive information.
                    </p>

                    <h2 className="font-semibold text-xl">5. User Rights</h2>
                    <p>
                        Users have the right to:
                        <ul className="list-disc list-inside mt-1">
                            <li>Access their personal data stored on Medrae</li>
                            <li>Update or correct inaccurate information</li>
                            <li>Request deletion of personal data (subject to platform operation requirements)</li>
                            <li>Opt-out of non-essential communications and notifications</li>
                        </ul>
                        Requests can be submitted via the contact methods listed on the platform.
                    </p>

                    <h2 className="font-semibold text-xl">6. Cookies & Tracking</h2>
                    <p>
                        Medrae may use cookies or similar tracking technologies to enhance user experience, understand usage patterns, and deliver relevant content. Users can manage cookie preferences through their browser settings, but some platform functionality may be affected.
                    </p>

                    <h2 className="font-semibold text-xl">7. Children’s Privacy</h2>
                    <p>
                        Medrae is intended for users aged 13 and above. We do not knowingly collect personal data from children under 13. If we become aware of such data, we will take immediate steps to delete it.
                    </p>

                    <h2 className="font-semibold text-xl">8. Changes to this Privacy Policy</h2>
                    <p>
                        Medrae may update this Privacy Policy from time to time. Users are encouraged to review the latest version regularly. Continued use of the platform constitutes acceptance of any changes.
                    </p>

                    <h2 className="font-semibold text-xl">9. Contact Us</h2>
                    <p>
                        For questions, concerns, or requests regarding this Privacy Policy, users may contact Medrae via email or the support section on the platform. We will respond promptly and assist with any privacy-related issues.
                    </p>

                </section>

                {/* Footer with back link and date */}
                <div className="mt-10 text-center space-y-2 text-gray-500 text-xs">
                    <p>
                        © {currentYear} <span className="font-semibold">Medrae Nursing</span>. All rights reserved.
                    </p>
                    <p>
                        Medrae collects and uses personal information solely to provide educational support safely and responsibly. Users must adhere to all rules and local laws while using the platform.
                    </p>
                    <p
                        onClick={() => navigate(-1)}
                        className="underline cursor-pointer hover:text-gray-900 dark:hover:text-gray-700"
                    >
                        Back
                    </p>
                    <p>Last Updated: February 2026</p>
                </div>
            </div>
        </div>
    );
}