"use client";

import { useNavigate } from "react-router-dom";

export default function TermsPage() {
    const navigate = useNavigate();
    const currentYear = new Date().getFullYear();

    return (
        <div className="w-full min-h-screen bg-white text-gray-900 py-2 px-2">
            <div className="max-w-4xl mx-auto space-y-2 text-sm text-gray-700">

                <h1 className="text-3xl font-bold mb-6">Terms & Conditions</h1>

                <section className="space-y-1">

                    <h2 className="font-semibold text-xl">1. General Rules</h2>
                    <p>
                        Medrae is a platform dedicated to supporting nursing students with revision materials, study notes, and educational resources. All users must use the platform responsibly and ethically. Creating multiple accounts to bypass rules or gain an unfair advantage is strictly prohibited. Providing false information, impersonating other users, or attempting to manipulate the platform in any way may result in immediate suspension or permanent account termination. By using Medrae, you acknowledge that you will follow the rules, respect other users, and contribute positively to the learning community.
                    </p>
                    <h2 className="font-semibold text-xl">2. Platform Usage Guidelines</h2>
                    <p>
                        Medrae is intended solely for educational purposes. The platform must never be used for exam malpractice, cheating, or sharing answers during real exams. Posting misleading, false, or harmful information is strictly prohibited. Users should only upload content that they have the right to share. Copying or redistributing Medrae’s proprietary content without authorization is not allowed. The platform monitors unusual activity and may take action against accounts attempting to violate these rules, including reporting to appropriate authorities if necessary.
                    </p>
                    <h2 className="font-semibold text-xl">3. Listings and Marketplace Rules (NursMartt)</h2>
                    <p>
                        NursMartt is the dedicated branch of Medrae for buying and selling study materials, textbooks, and student utilities. All listings must be accurate, including title, description, condition, and price. Sellers should provide clear images and honest descriptions of items. Posting illegal, unsafe, or counterfeit items is prohibited. Medrae does not directly facilitate payments and is not liable for disputes between buyers and sellers. Users are encouraged to transact safely, meet in public spaces, and verify items before purchase. Compliance with Kenyan laws regarding sales, safety, and ownership is mandatory.
                    </p>
                    <h2 className="font-semibold text-xl">4. User Responsibilities</h2>
                    <p>
                        Users are responsible for maintaining accurate profiles with real names, contact information, and relevant details. Communication between buyers and sellers should be honest, timely, and respectful. Users must refrain from harassment, spamming, or abusive behavior. Any violation may result in warnings, temporary suspension, or permanent account bans. Repeat offenders or severe cases will be reported to authorities in accordance with Kenyan law.
                    </p>

                    <h2 className="font-semibold text-xl">5. Privacy and Safety</h2>
                    <p>
                        Medrae respects user privacy and collects information to improve services and ensure safe interactions. Users must not share others’ contact details without consent or misuse personal information. When meeting for transactions, always choose safe, public locations. Medrae is not responsible for accidents, theft, or damages that may occur during in-person exchanges. Users should exercise caution and common sense at all times. Use of Medrae is also governed by our   <span
                            className="underline cursor-pointer text-blue-600"
                            onClick={() => navigate("/privacy")}
                        >
                            Privacy Policy
                        </span>.
                    </p>

                    <h2 className="font-semibold text-xl">6. Content Standards</h2>
                    <p>
                        All content uploaded to Medrae, including notes, study materials, or listings, must be truthful and educational. Do not post offensive, harmful, illegal, or plagiarized content. Misleading or false educational content that could negatively affect learners is prohibited. Medrae reserves the right to remove content that violates these standards without notice.
                    </p>

                    <h2 className="font-semibold text-xl">7. Intellectual Property Rights</h2>
                    <p>
                        All platform design, branding, logos, system code, and original content belong to Medrae. Users may not reproduce, reverse engineer, scrape, or otherwise copy the platform’s proprietary content without written authorization. Content uploaded by users remains the property of the user, but Medrae retains a worldwide, royalty-free license to display such content on the platform and for promotional purposes.
                    </p>
                    <h2 className="font-semibold text-xl">8. Limitation of Liability</h2>
                    <p>
                        Medrae is provided “as is” and does not guarantee uninterrupted or error-free service. The platform is not responsible for any:
                        <ul className="list-disc list-inside mt-1">
                            <li>Loss of money in marketplace transactions</li>
                            <li>Loss or corruption of data</li>
                            <li>Technical errors or downtime</li>
                            <li>Educational outcomes, including exam results</li>
                        </ul>
                        By using Medrae, users accept that all risk related to their use is theirs alone.
                    </p>

                    <h2 className="font-semibold text-xl">9. Disclaimer</h2>
                    <p>
                        Medrae content is intended solely for educational purposes. It does not replace professional medical advice, official academic guidance, or personalized tutoring. Marketplace transactions are strictly between users, and Medrae is not a party to any disputes or agreements.
                    </p>

                    <h2 className="font-semibold text-xl">10. Payment & Refund Policy</h2>
                    <p>
                        Any future paid services or premium features introduced by Medrae are subject to non-refundable payment terms unless explicitly stated. Medrae reserves the right to modify pricing or fees at any time. Users are responsible for reviewing the latest terms before making purchases.
                    </p>

                    <h2 className="font-semibold text-xl">11. Compliance with Laws</h2>
                    <p>
                        Users must adhere to all applicable Kenyan laws, regulations, and educational guidelines. Selling illegal items, sharing exam answers for cheating, or engaging in any illegal activity through Medrae is strictly forbidden. Serious violations may be reported to authorities, and legal action may be pursued where necessary. Users are responsible for their own actions while using the platform.
                    </p>

                    <h2 className="font-semibold text-xl">12. Account Suspension and Termination</h2>
                    <p>
                        Medrae may suspend or permanently terminate accounts that violate platform rules, engage in fraud, or post harmful content. This includes, but is not limited to, creating multiple accounts, sharing unauthorized content, or attempting to manipulate the system. Severe or repeated violations may lead to permanent bans and legal reporting.
                    </p>

                    <h2 className="font-semibold text-xl">13. Governing Law & Jurisdiction</h2>
                    <p>
                        These Terms & Conditions are governed by the laws of Kenya. Any disputes arising from the use of Medrae shall be resolved under Kenyan jurisdiction.
                    </p>

                    <h2 className="font-semibold text-xl">14. Updates to Terms & Conditions</h2>
                    <p>
                        Medrae reserves the right to update these Terms & Conditions at any time. Users are responsible for reviewing the latest version. Continued use of the platform constitutes acceptance of updated terms. Notifications of significant changes may be provided, but users should regularly check the Terms to ensure compliance.
                    </p>

                </section>

                {/* Footer with back link and date */}
                <div className="mt-10 text-center space-y-2 text-gray-500 text-xs">
                    <p>
                        © {currentYear} <span className="font-semibold">Medrae  Nursing</span>. All rights reserved.
                    </p>
                    <p>
                        Medrae is designed to provide educational support for nursing students through study notes, questions, and learning resources. Users must adhere to all rules and local laws while using the platform.
                    </p>
                    <span
                        className="underline cursor-pointer text-blue-600"
                        onClick={() => navigate("/privacy")}
                    >
                        Privacy Policy
                    </span>
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