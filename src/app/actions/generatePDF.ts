import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface OrderSummaryData {
  orderId: string;
  transactionId: string;
  customerName: string;
  email: string;
  orderDate: string;
  products: Array<{
    name: string;
    quantity: number;
    price: number;
    imageUrl?: string;
  }>;
  subtotal: number;
  shippingCost: number;
  tax: number;
  total: number;
  shippingAddress: {
    street: string;
    city: string;
    region: string;
    country: string;
  };
  paymentMethod: string;
  estimatedDelivery: string;
}

export const generateOrderPDF = async (
  orderData: OrderSummaryData,
  element?: HTMLElement
) => {
  const pdf = new jsPDF("p", "mm", "a4");

  if (element) {
    // Capture the order summary element as image
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
    });

    const imgData = canvas.toDataURL("image/png");
    const imgWidth = 190;
    const pageHeight = 280;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 10;

    pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }
  } else {
    // Generate PDF programmatically
    let yPosition = 20;

    // Title
    pdf.setFontSize(20);
    pdf.setTextColor(0, 0, 128);
    pdf.text("ORDER CONFIRMATION", 105, yPosition, { align: "center" });
    yPosition += 15;

    // Order Details
    pdf.setFontSize(12);
    pdf.setTextColor(0, 0, 0);

    pdf.text(`Order ID: ${orderData.orderId}`, 20, yPosition);
    yPosition += 8;
    pdf.text(`Transaction ID: ${orderData.transactionId}`, 20, yPosition);
    yPosition += 8;
    pdf.text(`Order Date: ${orderData.orderDate}`, 20, yPosition);
    yPosition += 8;
    pdf.text(`Customer: ${orderData.customerName}`, 20, yPosition);
    yPosition += 8;
    pdf.text(`Email: ${orderData.email}`, 20, yPosition);
    yPosition += 15;

    // Products
    pdf.setFontSize(14);
    pdf.setTextColor(0, 0, 128);
    pdf.text("ORDER ITEMS", 20, yPosition);
    yPosition += 10;

    pdf.setFontSize(10);
    pdf.setTextColor(0, 0, 0);

    orderData.products.forEach((product, index) => {
      if (yPosition > 250) {
        pdf.addPage();
        yPosition = 20;
      }

      pdf.text(`${product.name}`, 20, yPosition);
      pdf.text(`Qty: ${product.quantity}`, 120, yPosition);
      pdf.text(
        `$${(product.price * product.quantity).toFixed(2)}`,
        180,
        yPosition,
        { align: "right" }
      );
      yPosition += 6;
    });

    yPosition += 10;

    // Pricing
    pdf.setFontSize(12);
    pdf.text(`Subtotal: $${orderData.subtotal.toFixed(2)}`, 150, yPosition, {
      align: "right",
    });
    yPosition += 8;
    pdf.text(
      `Shipping: $${orderData.shippingCost.toFixed(2)}`,
      150,
      yPosition,
      { align: "right" }
    );
    yPosition += 8;
    pdf.text(`Tax: $${orderData.tax.toFixed(2)}`, 150, yPosition, {
      align: "right",
    });
    yPosition += 8;

    pdf.setFontSize(14);
    pdf.setFont("", "bold");
    pdf.text(`Total: $${orderData.total.toFixed(2)}`, 150, yPosition, {
      align: "right",
    });
    yPosition += 15;

    // Shipping Address
    pdf.setFontSize(14);
    pdf.setFont("", "normal");
    pdf.setTextColor(0, 0, 128);
    pdf.text("SHIPPING ADDRESS", 20, yPosition);
    yPosition += 10;

    pdf.setFontSize(10);
    pdf.setTextColor(0, 0, 0);
    pdf.text(`${orderData.shippingAddress.street}`, 20, yPosition);
    yPosition += 6;
    pdf.text(
      `${orderData.shippingAddress.city}, ${orderData.shippingAddress.region}`,
      20,
      yPosition
    );
    yPosition += 6;
    pdf.text(`${orderData.shippingAddress.country}`, 20, yPosition);
    yPosition += 15;

    // Payment Method
    pdf.setFontSize(14);
    pdf.setTextColor(0, 0, 128);
    pdf.text("PAYMENT METHOD", 20, yPosition);
    yPosition += 10;

    pdf.setFontSize(10);
    pdf.setTextColor(0, 0, 0);
    pdf.text(`${orderData.paymentMethod}`, 20, yPosition);
    yPosition += 15;

    // Delivery Estimate
    pdf.setFontSize(14);
    pdf.setTextColor(0, 0, 128);
    pdf.text("ESTIMATED DELIVERY", 20, yPosition);
    yPosition += 10;

    pdf.setFontSize(10);
    pdf.setTextColor(0, 0, 0);
    pdf.text(`${orderData.estimatedDelivery}`, 20, yPosition);
  }

  // Save the PDF
  pdf.save(`order-${orderData.orderId}.pdf`);
};
