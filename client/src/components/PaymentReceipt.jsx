import { jsPDF } from 'jspdf';

export default function PaymentReceipt({ caseData, patientName }) {
  const generatePDF = () => {
    const doc = new jsPDF();
    
    // Colors
    const primaryBlue = '#10243a';
    const accentRed = '#dc2626';
    const textDark = '#17233b';
    const textMuted = '#64748b';

    // --- HEADER ---
    doc.setFillColor(primaryBlue);
    doc.rect(0, 0, 210, 40, 'F'); // Draw blue header box

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('MediRescue', 15, 20);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Emergency Medical Response System', 15, 28);
    doc.text('Official Payment Receipt', 15, 34);

    // --- RECEIPT DETAILS ---
    doc.setTextColor(textDark);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Payment Receipt', 15, 55);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(textMuted);
    
    // Right aligned receipt info
    doc.text(`Receipt No: MR-${caseData.id}-${new Date().getFullYear()}`, 195, 55, { align: 'right' });
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 195, 61, { align: 'right' });

    // Draw a line
    doc.setDrawColor(200, 200, 200);
    doc.line(15, 65, 195, 65);

    // --- PATIENT INFO ---
    doc.setTextColor(textDark);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Billed To:', 15, 75);
    
    doc.setFont('helvetica', 'normal');
    doc.text(patientName || 'Valued Patient', 15, 81);
    doc.text(`Case ID: #${caseData.id}`, 15, 87);
    doc.text(`Hospital: ${caseData.hospital_name || 'MediRescue Partner'}`, 15, 93);

    // --- TABLE HEADER ---
    doc.setFillColor(245, 247, 250);
    doc.rect(15, 105, 180, 10, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(textDark);
    doc.text('Description', 20, 111);
    doc.text('Amount', 185, 111, { align: 'right' });

    // --- TABLE ROW ---
    doc.setFont('helvetica', 'normal');
    doc.text(caseData.emergency_desc || caseData.emergency_type || 'Emergency Medical Services', 20, 125);
    
    const amount = Number(caseData.payment_amount) || 0;
    doc.text(`KSh ${amount.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`, 185, 125, { align: 'right' });

    // --- TOTAL BOX ---
    doc.setDrawColor(200, 200, 200);
    doc.line(15, 135, 195, 135); // Horizontal line

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(accentRed);
    doc.text('Total Paid:', 130, 145);
    doc.text(`KSh ${amount.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`, 185, 145, { align: 'right' });

    // --- FOOTER ---
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(textMuted);
    doc.text('Thank you for using MediRescue.', 105, 180, { align: 'center' });
    doc.text('This is a computer-generated receipt. No signature is required.', 105, 186, { align: 'center' });

    // Save the PDF
    doc.save(`MediRescue_Receipt_Case_${caseData.id}.pdf`);
  };

  return (
    <button
      onClick={generatePDF}
      style={{
        background: '#2563eb',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        padding: '12px 20px',
        fontSize: '14px',
        fontWeight: 'bold',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        marginTop: '15px',
        boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)'
      }}
    >
      📄 Download PDF Receipt
    </button>
  );
}