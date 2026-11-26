import jsPDF from "jspdf";

// ─────────────────────────────────────────────────────────────
// Load image as base64 data URL
// ─────────────────────────────────────────────────────────────
async function loadImageAsDataUrl(src: string): Promise<string | null> {
    try {
        const res = await fetch(src, { cache: "force-cache" });
        if (!res.ok) return null;
        const blob = await res.blob();
        return await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch {
        return null;
    }
}

// ─────────────────────────────────────────────────────────────
// Convert QR SVG element to canvas
// ─────────────────────────────────────────────────────────────
function convertSvgToCanvas(svgElement: SVGElement): Promise<HTMLCanvasElement> {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const svgString = new XMLSerializer().serializeToString(svgElement);
        const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(svgBlob);
        const img = new Image();
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx?.drawImage(img, 0, 0, img.width, img.height);
            URL.revokeObjectURL(url);
            resolve(canvas);
        };
        img.onerror = reject;
        img.src = url;
    });
}

// ─────────────────────────────────────────────────────────────
// Generate the branded referral PDF poster
// ─────────────────────────────────────────────────────────────
export async function generateReferralPDF({
    qrContainer,
    shortCode,
    productionUrl,
}: {
    qrContainer: HTMLDivElement;
    shortCode: string;
    productionUrl: string;
}) {
    const svgElement = qrContainer.querySelector("svg");
    if (!svgElement) throw new Error("QR code not found");

    const canvas = await convertSvgToCanvas(svgElement);
    const qrImageData = canvas.toDataURL("image/png");
    const logoData = await loadImageAsDataUrl("/pwaa-512x512.png");

    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const centerX = pageWidth / 2;

    // ─── HEADER BAND ─────────────────────────────
    // ─── HEADER BAND ─────────────────────────────
    pdf.setFillColor(255, 255, 255);
    pdf.rect(0, 0, pageWidth, 46, "F");

    // Optional: thin bottom divider so the header reads as a band
    pdf.setDrawColor(226, 232, 240);
    pdf.setLineWidth(0.3);
    pdf.line(0, 46, pageWidth, 46);

    // Centered logo
    if (logoData) {
        const logoSize = 16;
        pdf.addImage(logoData, "PNG", centerX - logoSize / 2, 6, logoSize, logoSize);
    }

    // Two-tone title: MEDRAE red, NURSING dark
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(20);

    const word1 = "MEDRAE";
    const word2 = " NURSING";
    const totalW = pdf.getTextWidth(word1) + pdf.getTextWidth(word2);
    const startX = centerX - totalW / 2;

    pdf.setTextColor(220, 38, 38);          // red
    pdf.text(word1, startX, 30);

    pdf.setTextColor(15, 23, 42);           // slate-900 (dark)
    pdf.text(word2, startX + pdf.getTextWidth(word1), 30);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(71, 85, 105);
    pdf.text("Kenya's Nursing Network", centerX, 35, { align: "center" });

    pdf.setFontSize(8.5);
    pdf.setTextColor(100, 116, 139);
    pdf.text("Care begins with love.", centerX, 40, { align: "center" });

    // ─── HERO HEADLINE ───────────────────────────
    pdf.setTextColor(15, 23, 42);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(17);
    pdf.text("YOU'RE INVITED TO JOIN MEDRAE", centerX, 58, { align: "center" });

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10.5);
    pdf.setTextColor(71, 85, 105);
    pdf.text(
        "Scan the QR code below or enter the invite code to create your free account.",
        centerX,
        65,
        { align: "center", maxWidth: pageWidth - 40 }
    );

    // ─── QR CODE BLOCK ───────────────────────────
    const qrSize = 72;
    const qrX = (pageWidth - qrSize) / 2;
    const qrY = 72;

    pdf.setDrawColor(226, 232, 240);
    pdf.setLineWidth(0.4);
    pdf.roundedRect(qrX - 6, qrY - 6, qrSize + 12, qrSize + 12, 4, 4, "S");
    pdf.addImage(qrImageData, "PNG", qrX, qrY, qrSize, qrSize);

    // ─── INVITE CODE ─────────────────────────────
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(100, 116, 139);
    pdf.text("YOUR INVITE CODE", centerX, qrY + qrSize + 12, { align: "center" });

    pdf.setFont("courier", "bold");
    pdf.setFontSize(26);
    pdf.setTextColor(37, 99, 235);
    pdf.text(shortCode, centerX, qrY + qrSize + 24, { align: "center" });

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9.5);
    pdf.setTextColor(71, 85, 105);
    pdf.text(
        "Enter this code on the sign-up screen if you can't scan.",
        centerX,
        qrY + qrSize + 31,
        { align: "center" }
    );

    // ─── REWARDS PANEL ───────────────────────────
    const panelY = qrY + qrSize + 40;
    const panelW = pageWidth - 32;
    const panelX = 16;
    pdf.setFillColor(240, 249, 255);
    pdf.roundedRect(panelX, panelY, panelW, 26, 3, 3, "F");

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.setTextColor(37, 99, 235);
    pdf.text("WHAT YOU GET", panelX + 6, panelY + 7);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9.5);
    pdf.setTextColor(30, 41, 59);
    pdf.text("- 1 day of Premium access - absolutely free on sign-up.", panelX + 6, panelY + 13);
    pdf.text("- Full access to nursing quizzes, past papers, and study notes.", panelX + 6, panelY + 18);
    pdf.text("- Entry into School Wars - compete for your institution.", panelX + 6, panelY + 23);

    // ─── HOW TO JOIN ─────────────────────────────
    const howY = panelY + 34;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.setTextColor(15, 23, 42);
    pdf.text("HOW TO JOIN", panelX + 2, howY);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9.5);
    pdf.setTextColor(51, 65, 85);

    const steps = [
        "1. Scan the QR code above with your phone camera.",
        "2. Open the link and tap 'Sign Up'.",
        "3. Enter your details and the invite code if asked.",
        "4. Start learning immediately - your Premium day is added automatically.",
    ];
    steps.forEach((line, i) => {
        pdf.text(line, panelX + 2, howY + 6 + i * 5);
    });

    // ─── FOOTER ──────────────────────────────────
    pdf.setDrawColor(226, 232, 240);
    pdf.setLineWidth(0.3);
    pdf.line(16, pageHeight - 24, pageWidth - 16, pageHeight - 24);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(148, 163, 184);
    pdf.text(
        "Medrae Nursing Network - Learn. Practice. Advance.",
        centerX,
        pageHeight - 17,
        { align: "center" }
    );
    pdf.text(productionUrl, centerX, pageHeight - 12, { align: "center" });
    pdf.text(
        "Valid for new users only. One referral per person. Terms apply.",
        centerX,
        pageHeight - 7,
        { align: "center" }
    );

    pdf.save(`Medrae_Invite_${shortCode}.pdf`);
}