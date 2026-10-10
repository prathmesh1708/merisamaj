import { donationService } from './donationService';

class ReceiptService {
  async getReceiptData(txnId) {
    await new Promise(resolve => setTimeout(resolve, 150));
    const txnsRes = await donationService.getTransactions();
    const txn = txnsRes.data.find(t => t.id === txnId);
    if (!txn) throw new Error('Transaction record not found.');
    
    // Check if the payment status is Approved
    if (txn.paymentStatus !== 'Approved') {
      throw new Error('Receipt can only be generated for approved payments.');
    }

    // Return structured data for receipt layout
    return {
      receiptNumber: `REC-${txn.id.replace('TXN-', '')}-${new Date(txn.date).getFullYear()}`,
      transactionId: txn.id,
      memberName: txn.memberName,
      memberId: txn.memberId,
      community: txn.community,
      city: txn.city,
      campaignName: txn.campaignName,
      amount: txn.amount,
      paymentMethod: txn.paymentMethod,
      referenceNumber: txn.referenceNumber,
      date: new Date(txn.date).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      }),
      time: new Date(txn.date).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }),
      panNumber: 'AAAAA0000A', // Mock PAN for Samaj Trust registration
      trustRegistrationNumber: 'TRUST/REG-IND/409/2012',
      exemption80G: 'CIT(E)/Indore/80G/2018-19/A-9182',
      authorizedSignatory: 'Pt. Ramesh Chand',
      authorizedSignatoryTitle: 'General Secretary / Treasurer'
    };
  }

  async printReceipt(txnId) {
    const data = await this.getReceiptData(txnId);
    const printWindow = window.open('', '_blank');
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Donation Receipt - ${data.receiptNumber}</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1e293b; padding: 40px; margin: 0; line-height: 1.5; }
            .receipt-card { border: 2px solid #e2e8f0; border-radius: 16px; padding: 40px; max-width: 700px; margin: 0 auto; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #7c3aed; pb: 20px; padding-bottom: 20px; }
            .logo-sec { display: flex; align-items: center; gap: 12px; }
            .logo-box { width: 40px; height: 40px; background: linear-gradient(135deg, #7c3aed, #4f46e5); color: #fff; font-weight: bold; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 20px; }
            .title-box { font-size: 22px; font-weight: 800; color: #0f172a; margin: 0; }
            .subtitle { font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; margin: 0; margin-top: 2px; }
            .receipt-meta { text-align: right; }
            .receipt-meta h2 { font-size: 18px; font-weight: 800; margin: 0; color: #7c3aed; }
            .receipt-meta p { font-size: 12px; margin: 3px 0 0 0; color: #64748b; }
            .trust-info { font-size: 10px; color: #64748b; margin-top: 15px; background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #f1f5f9; }
            .trust-info p { margin: 2px 0; }
            .details-table { width: 100%; border-collapse: collapse; margin-top: 30px; }
            .details-table th, .details-table td { padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: left; font-size: 13px; }
            .details-table th { color: #64748b; text-transform: uppercase; font-size: 10px; font-weight: bold; }
            .details-table td { color: #0f172a; font-weight: 600; }
            .amount-section { display: flex; justify-content: space-between; align-items: center; background: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 12px; padding: 18px 24px; margin-top: 30px; }
            .amount-label { font-size: 12px; font-weight: bold; color: #4f46e5; text-transform: uppercase; }
            .amount-val { font-size: 24px; font-weight: 900; color: #7c3aed; }
            .footer-section { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 45px; }
            .note { font-size: 11px; color: #94a3b8; max-width: 350px; }
            .signature-sec { text-align: center; }
            .signature-line { width: 180px; border-bottom: 1px solid #94a3b8; margin-bottom: 6px; }
            .signature-sec p { font-size: 11px; font-weight: bold; color: #0f172a; margin: 0; }
            .signature-sec span { font-size: 9px; color: #64748b; }
            @media print {
              body { padding: 0; }
              .receipt-card { border: none; box-shadow: none; padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="receipt-card">
            <div class="header">
              <div class="logo-sec">
                <div class="logo-box">म</div>
                <div>
                  <h1 class="title-box">ApniSamaj Trust</h1>
                  <p class="subtitle">Empowering and Connecting Communities</p>
                </div>
              </div>
              <div class="receipt-meta">
                <h2>DONATION RECEIPT</h2>
                <p><strong>Receipt No:</strong> ${data.receiptNumber}</p>
                <p><strong>Date:</strong> ${data.date}</p>
              </div>
            </div>

            <div class="trust-info">
              <p><strong>Registered Trust Address:</strong> Central Samaj Seva Sadan, Ring Road Plot 45, Indore, MP 452001</p>
              <p><strong>Registration No:</strong> ${data.trustRegistrationNumber} | <strong>80G Exemption No:</strong> ${data.exemption80G}</p>
              <p><strong>Samaj Trust PAN:</strong> ${data.panNumber} (Donations to this trust are eligible for tax deduction under section 80G of IT Act)</p>
            </div>

            <table class="details-table">
              <tr>
                <th>Donor Name</th>
                <td>${data.memberName} (${data.memberId || 'Registered Member'})</td>
              </tr>
              <tr>
                <th>Samaj Community</th>
                <td>${data.community} (${data.city})</td>
              </tr>
              <tr>
                <th>Donation Purpose (Campaign)</th>
                <td>${data.campaignName}</td>
              </tr>
              <tr>
                <th>Payment Mode</th>
                <td>${data.paymentMethod}</td>
              </tr>
              <tr>
                <th>Txn Ref Number / ID</th>
                <td>${data.referenceNumber} | (${data.transactionId})</td>
              </tr>
            </table>

            <div class="amount-section">
              <span class="amount-label">Total Amount Donated</span>
              <span class="amount-val">₹${data.amount.toLocaleString('en-IN')}.00</span>
            </div>

            <div class="footer-section">
              <div class="note">
                <p>This is a computer-generated receipt, and does not require a physical signature for validity. For queries, contact support@merisamaj.org</p>
              </div>
              <div class="signature-sec">
                <div style="font-family: 'Brush Script MT', cursive, sans-serif; font-size: 22px; color: #4f46e5; margin-bottom: 2px;">Ramesh Chand</div>
                <div class="signature-line"></div>
                <p>${data.authorizedSignatory}</p>
                <span>${data.authorizedSignatoryTitle}</span>
              </div>
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    return true;
  }
}

export const receiptService = new ReceiptService();
