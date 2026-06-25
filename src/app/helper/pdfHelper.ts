import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs";

const createUnlockedPdf = (options: PDFKit.PDFDocumentOptions) =>
  new PDFDocument({
    ...options,
    userPassword: undefined,
    ownerPassword: undefined,
    permissions: undefined,
  });

/**
 * Colors from the project's brand palette
 */
const COLORS = {
  primary: "#16a34a", // brand-600
  secondary: "#0f172a", // slate-900
  text: "#334155", // slate-700
  muted: "#64748b", // slate-500
  light: "#f8fafc", // slate-50
  border: "#e2e8f0", // slate-200
  white: "#ffffff",
};

const generateDashboardReport = (
  stats: any,
  from?: Date,
  to?: Date,
): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = createUnlockedPdf({
        margin: 50,
        size: "A4",
        info: {
          Title: "Executive Dashboard Report",
          Author: "Krishi Bari",
        },
      });

      const buffers: Buffer[] = [];
      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", (err) => reject(err));

      // --- Header ---
      const logoPath = path.join(
        process.cwd(),
        "src",
        "app",
        "assets",
        "logo.png",
      );
      let logoAdded = false;

      if (fs.existsSync(logoPath)) {
        try {
          doc.image(logoPath, 50, 45, { width: 40 });
          logoAdded = true;
        } catch (err) {
          console.error("Failed to add logo to PDF:", err);
        }
      }

      if (logoAdded) {
        doc
          .fillColor(COLORS.primary)
          .font("Helvetica-Bold")
          .fontSize(22)
          .text("Krishi Bari", 100, 55);
      } else {
        doc
          .fillColor(COLORS.primary)
          .font("Helvetica-Bold")
          .fontSize(22)
          .text("Krishi Bari", 50, 55);
      }

      doc
        .fillColor(COLORS.text)
        .font("Helvetica")
        .fontSize(10)
        .text("Dhaka, Bangladesh", 50, 85)
        .text("support@krishibari.com", 50, 100);

      doc
        .fillColor(COLORS.secondary)
        .font("Helvetica-Bold")
        .fontSize(20)
        .text("DASHBOARD REPORT", 300, 55, { align: "right" });

      const dateStr =
        from && to
          ? `Period: ${from.toLocaleDateString()} - ${to.toLocaleDateString()}`
          : "Period: All-Time Data";
      doc
        .fillColor(COLORS.muted)
        .font("Helvetica")
        .fontSize(9)
        .text(dateStr, 300, 80, { align: "right" })
        .text(`Generated on: ${new Date().toLocaleDateString()}`, 300, 95, {
          align: "right",
        });

      doc.moveDown();

      // --- KPI Cards Grid ---
      const gridY = 140;
      const cardWidth = 115;
      const cardHeight = 65;
      const gap = 13;

      const drawKPICard = (
        x: number,
        label: string,
        value: string,
        sub: string,
        bgColor: string,
        textColor: string,
      ) => {
        doc.rect(x, gridY, cardWidth, cardHeight).fill(bgColor);
        doc
          .fillColor(textColor)
          .font("Helvetica-Bold")
          .fontSize(15)
          .text(value, x + 12, gridY + 15);
        doc
          .fillColor(COLORS.text)
          .font("Helvetica-Bold")
          .fontSize(8)
          .text(label.toUpperCase(), x + 12, gridY + 35);
        doc
          .fillColor(COLORS.muted)
          .font("Helvetica")
          .fontSize(7)
          .text(sub, x + 12, gridY + 47);
      };

      drawKPICard(
        50,
        "Total Revenue",
        `Tk. ${stats.revenue.total.toFixed(2)}`,
        `This Month: Tk. ${stats.revenue.thisMonth.toFixed(2)}`,
        COLORS.light,
        COLORS.primary,
      );
      drawKPICard(
        50 + cardWidth + gap,
        "Total Orders",
        `${stats.orders.total}`,
        `Today: ${stats.orders.today} | Pend: ${stats.orders.pending}`,
        COLORS.light,
        COLORS.secondary,
      );
      drawKPICard(
        50 + (cardWidth + gap) * 2,
        "Customers",
        `${stats.customers.total}`,
        `New Today: ${stats.customers.newToday}`,
        COLORS.light,
        COLORS.secondary,
      );
      drawKPICard(
        50 + (cardWidth + gap) * 3,
        "Products Active",
        `${stats.products.total}`,
        `${stats.products.lowStock.length} Low Stock`,
        COLORS.light,
        "#b45309",
      );

      // --- Left: Top Selling Products Table ---
      const leftSectionY = 230;
      doc
        .fillColor(COLORS.secondary)
        .font("Helvetica-Bold")
        .fontSize(12)
        .text("Top Selling Products", 50, leftSectionY);

      doc.rect(50, leftSectionY + 15, 230, 20).fill(COLORS.secondary);
      doc
        .fillColor(COLORS.white)
        .font("Helvetica-Bold")
        .fontSize(8)
        .text("PRODUCT NAME", 60, leftSectionY + 21)
        .text("QTY SOLD", 220, leftSectionY + 21, {
          width: 50,
          align: "right",
        });

      let currentLeftY = leftSectionY + 40;
      stats.topProducts.slice(0, 7).forEach((tp: any, index: number) => {
        if (index % 2 === 0) {
          doc.rect(50, currentLeftY - 3, 230, 16).fill("#fcfcfc");
          doc.fillColor(COLORS.text);
        }
        doc.fillColor(COLORS.text).font("Helvetica").fontSize(8);
        doc.text(
          tp.product?.name?.split(" ").slice(0, 3).join(" ") ??
            `Product #${tp.productId}`,
          60,
          currentLeftY,
          { width: 155 },
        );
        doc.text(tp._sum.quantity.toString(), 220, currentLeftY, {
          width: 50,
          align: "right",
        });
        currentLeftY += 20;
      });

      // --- Right: Stock Alerts Table ---
      doc
        .fillColor(COLORS.secondary)
        .font("Helvetica-Bold")
        .fontSize(12)
        .text("Critical Stock Alerts", 310, leftSectionY);

      doc.rect(310, leftSectionY + 15, 240, 20).fill("#fef3c7");
      doc
        .fillColor("#b45309")
        .font("Helvetica-Bold")
        .fontSize(8)
        .text("SKU", 320, leftSectionY + 21)
        .text("PRODUCT DESCRIPTION", 380, leftSectionY + 21)
        .text("STOCK", 500, leftSectionY + 21, { width: 40, align: "right" });

      let currentRightY = leftSectionY + 40;
      stats.products.lowStock.slice(0, 7).forEach((p: any, index: number) => {
        if (index % 2 === 0) {
          doc.rect(310, currentRightY - 3, 240, 16).fill("#fffbeb");
        }
        doc.fillColor(COLORS.text).font("Helvetica").fontSize(8);
        doc.text(p.sku, 320, currentRightY, { width: 55 });
        doc.text(p.name.split(" ").slice(0, 3).join(" "), 380, currentRightY, {
          width: 110,
        });
        doc
          .fillColor(p.stock === 0 ? "#dc2626" : COLORS.text)
          .font("Helvetica-Bold");
        doc.text(p.stock.toString(), 500, currentRightY, {
          width: 40,
          align: "right",
        });
        currentRightY += 20;
      });

      // --- Recent Orders Section (Span full width) ---
      const tableY = Math.max(currentLeftY, currentRightY) + 20;
      doc
        .fillColor(COLORS.secondary)
        .font("Helvetica-Bold")
        .fontSize(12)
        .text("Recent Transactions Log", 50, tableY);

      doc.rect(50, tableY + 15, 500, 20).fill(COLORS.secondary);
      doc
        .fillColor(COLORS.white)
        .font("Helvetica-Bold")
        .fontSize(8)
        .text("ORDER ID", 65, tableY + 21)
        .text("CUSTOMER EMAIL", 140, tableY + 21)
        .text("DATE", 310, tableY + 21)
        .text("TOTAL AMOUNT", 380, tableY + 21, { width: 80, align: "right" })
        .text("STATUS", 480, tableY + 21, { width: 60, align: "center" });

      let currentTableY = tableY + 40;
      stats.recentOrders.slice(0, 8).forEach((o: any, index: number) => {
        if (index % 2 === 0) {
          doc.rect(50, currentTableY - 3, 500, 18).fill(COLORS.light);
          doc.fillColor(COLORS.text);
        }
        doc.fillColor(COLORS.text).font("Helvetica").fontSize(8);
        doc.text(`#${o.orderNumber}`, 65, currentTableY);
        doc.text(o.user.email, 140, currentTableY, { width: 160 });
        doc.text(
          new Date(o.createdAt).toLocaleDateString(),
          310,
          currentTableY,
        );
        doc
          .font("Helvetica-Bold")
          .text(`Tk. ${o.total.toFixed(2)}`, 380, currentTableY, {
            width: 80,
            align: "right",
          });
        doc.text(o.status, 480, currentTableY, { width: 60, align: "center" });
        currentTableY += 21;
      });

      // --- Footer ---
      doc
        .fillColor(COLORS.muted)
        .font("Helvetica")
        .fontSize(8)
        .text("Krishi Bari Executive Administration System Portal", 50, 760, {
          align: "center",
        });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

const generateSalesReport = (
  report: any,
  from: Date,
  to: Date,
): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = createUnlockedPdf({
        margin: 50,
        size: "A4",
        info: {
          Title: "Sales Performance Report",
          Author: "Krishi Bari",
        },
      });

      const buffers: Buffer[] = [];
      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", (err) => reject(err));

      // --- Header ---
      const logoPath = path.join(
        process.cwd(),
        "src",
        "app",
        "assets",
        "logo.png",
      );
      let logoAdded = false;

      if (fs.existsSync(logoPath)) {
        try {
          doc.image(logoPath, 50, 45, { width: 40 });
          logoAdded = true;
        } catch (err) {
          console.error("Failed to add logo to PDF:", err);
        }
      }

      if (logoAdded) {
        doc
          .fillColor(COLORS.primary)
          .font("Helvetica-Bold")
          .fontSize(22)
          .text("Krishi Bari", 100, 55);
      } else {
        doc
          .fillColor(COLORS.primary)
          .font("Helvetica-Bold")
          .fontSize(22)
          .text("Krishi Bari", 50, 55);
      }

      doc
        .fillColor(COLORS.text)
        .font("Helvetica")
        .fontSize(10)
        .text("Dhaka, Bangladesh", 50, 85)
        .text("support@krishibari.com", 50, 100);

      doc
        .fillColor(COLORS.secondary)
        .font("Helvetica-Bold")
        .fontSize(20)
        .text("SALES PERFORMANCE REPORT", 250, 55, { align: "right" });

      doc
        .fillColor(COLORS.muted)
        .font("Helvetica")
        .fontSize(9)
        .text(
          `Date Range: ${from.toLocaleDateString()} to ${to.toLocaleDateString()}`,
          250,
          80,
          { align: "right" },
        )
        .text(`Generated on: ${new Date().toLocaleDateString()}`, 250, 95, {
          align: "right",
        });

      doc.moveDown();

      // --- Summary Metrics Box ---
      const summaryY = 140;
      doc.rect(50, summaryY, 500, 60).fill(COLORS.light);

      doc
        .fillColor(COLORS.muted)
        .font("Helvetica")
        .fontSize(8)
        .text("TOTAL SALES REVENUE", 70, summaryY + 15)
        .text("TOTAL TRANSACTIONS", 240, summaryY + 15)
        .text("TOTAL VOLUME SOLD", 410, summaryY + 15);

      doc
        .fillColor(COLORS.primary)
        .font("Helvetica-Bold")
        .fontSize(16)
        .text(`Tk. ${report.totalRevenue.toFixed(2)}`, 70, summaryY + 30);

      doc
        .fillColor(COLORS.secondary)
        .text(`${report.totalOrders} Orders`, 240, summaryY + 30)
        .text(`${report.totalItems} Items`, 410, summaryY + 30);

      // --- Table Section ---
      const tableY = 230;
      doc
        .fillColor(COLORS.secondary)
        .font("Helvetica-Bold")
        .fontSize(12)
        .text("Daily Sales Volume & Revenue", 50, tableY);

      doc.rect(50, tableY + 18, 500, 20).fill(COLORS.secondary);
      doc
        .fillColor(COLORS.white)
        .font("Helvetica-Bold")
        .fontSize(9)
        .text("DATE", 70, tableY + 24)
        .text("ORDERS COUNT", 230, tableY + 24, { width: 100, align: "center" })
        .text("REVENUE GENERATED", 400, tableY + 24, {
          width: 130,
          align: "right",
        });

      let currentY = tableY + 43;
      Object.entries(report.byDate).forEach(
        ([date, v]: [string, any], index: number) => {
          if (index % 2 === 0) {
            doc.rect(50, currentY - 3, 500, 18).fill("#fcfcfc");
            doc.fillColor(COLORS.text);
          }
          doc.fillColor(COLORS.text).font("Helvetica").fontSize(9);
          doc.text(
            new Date(date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            }),
            70,
            currentY,
          );
          doc.text(v.orders.toString(), 230, currentY, {
            width: 100,
            align: "center",
          });
          doc
            .font("Helvetica-Bold")
            .text(`Tk. ${v.revenue.toFixed(2)}`, 400, currentY, {
              width: 130,
              align: "right",
            });

          currentY += 21;

          if (currentY > 700) {
            doc.addPage();
            currentY = 50;
          }
        },
      );

      // --- Footer ---
      doc
        .fillColor(COLORS.muted)
        .font("Helvetica")
        .fontSize(8)
        .text(
          "Krishi Bari Business Performance Dashboard Analytics Report",
          50,
          760,
          { align: "center" },
        );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

const generateInventoryReport = (report: any): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = createUnlockedPdf({
        margin: 50,
        size: "A4",
        info: {
          Title: "Inventory Health Report",
          Author: "Krishi Bari",
        },
      });

      const buffers: Buffer[] = [];
      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", (err) => reject(err));

      // --- Header ---
      const logoPath = path.join(
        process.cwd(),
        "src",
        "app",
        "assets",
        "logo.png",
      );
      let logoAdded = false;

      if (fs.existsSync(logoPath)) {
        try {
          doc.image(logoPath, 50, 45, { width: 40 });
          logoAdded = true;
        } catch (err) {
          console.error("Failed to add logo to PDF:", err);
        }
      }

      if (logoAdded) {
        doc
          .fillColor(COLORS.primary)
          .font("Helvetica-Bold")
          .fontSize(22)
          .text("Krishi Bari", 100, 55);
      } else {
        doc
          .fillColor(COLORS.primary)
          .font("Helvetica-Bold")
          .fontSize(22)
          .text("Krishi Bari", 50, 55);
      }

      doc
        .fillColor(COLORS.text)
        .font("Helvetica")
        .fontSize(10)
        .text("Dhaka, Bangladesh", 50, 85)
        .text("support@krishibari.com", 50, 100);

      doc
        .fillColor(COLORS.secondary)
        .font("Helvetica-Bold")
        .fontSize(20)
        .text("INVENTORY HEALTH REPORT", 250, 55, { align: "right" });

      doc
        .fillColor(COLORS.muted)
        .font("Helvetica")
        .fontSize(9)
        .text("System Level Stock Summary", 250, 80, { align: "right" })
        .text(`Generated on: ${new Date().toLocaleDateString()}`, 250, 95, {
          align: "right",
        });

      doc.moveDown();

      // --- Summary Metrics Box ---
      const summaryY = 140;
      doc.rect(50, summaryY, 500, 60).fill(COLORS.light);

      doc
        .fillColor(COLORS.muted)
        .font("Helvetica")
        .fontSize(8)
        .text("TOTAL ACTIVE CATALOG", 70, summaryY + 15)
        .text("LOW STOCK WARNINGS (≤10)", 240, summaryY + 15)
        .text("CRITICAL OUT OF STOCK (0)", 410, summaryY + 15);

      doc
        .fillColor(COLORS.secondary)
        .font("Helvetica-Bold")
        .fontSize(16)
        .text(`${report.totalProducts} Active SKUs`, 70, summaryY + 30);

      doc
        .fillColor("#b45309")
        .text(`${report.lowStockCount} Products`, 240, summaryY + 30);
      doc
        .fillColor("#dc2626")
        .text(`${report.outOfStockCount} Products`, 410, summaryY + 30);

      // --- Critical Out of Stock Section ---
      let currentY = 225;

      if (report.outOfStock.length > 0) {
        doc
          .fillColor("#dc2626")
          .font("Helvetica-Bold")
          .fontSize(11)
          .text("CRITICAL OUT OF STOCK ITEMS", 50, currentY);

        doc.rect(50, currentY + 15, 500, 18).fill("#fef2f2");
        doc
          .fillColor("#991b1b")
          .font("Helvetica-Bold")
          .fontSize(8)
          .text("SKU", 65, currentY + 20)
          .text("PRODUCT NAME", 150, currentY + 20)
          .text("CATEGORY", 370, currentY + 20)
          .text("CURRENT STOCK", 460, currentY + 20, {
            width: 80,
            align: "right",
          });

        currentY += 38;
        report.outOfStock.forEach((p: any, index: number) => {
          if (index % 2 === 0) {
            doc.rect(50, currentY - 3, 500, 16).fill("#fff5f5");
          }
          doc.fillColor(COLORS.text).font("Helvetica").fontSize(8);
          doc.text(p.sku, 65, currentY);
          doc.text(p.name, 150, currentY, { width: 210 });
          doc.text(p.category?.name || "N/A", 370, currentY);
          doc
            .fillColor("#dc2626")
            .font("Helvetica-Bold")
            .text(`0 ${p.unit}`, 460, currentY, { width: 80, align: "right" });

          currentY += 18;

          if (currentY > 700) {
            doc.addPage();
            currentY = 50;
          }
        });
        currentY += 15;
      }

      // --- Low Stock Section ---
      if (report.lowStock.length > 0) {
        if (currentY > 650) {
          doc.addPage();
          currentY = 50;
        }

        doc
          .fillColor("#b45309")
          .font("Helvetica-Bold")
          .fontSize(11)
          .text("LOW STOCK WARNING ITEMS", 50, currentY);

        doc.rect(50, currentY + 15, 500, 18).fill("#fffbeb");
        doc
          .fillColor("#92400e")
          .font("Helvetica-Bold")
          .fontSize(8)
          .text("SKU", 65, currentY + 20)
          .text("PRODUCT NAME", 150, currentY + 20)
          .text("CATEGORY", 370, currentY + 20)
          .text("CURRENT STOCK", 460, currentY + 20, {
            width: 80,
            align: "right",
          });

        currentY += 38;
        report.lowStock.forEach((p: any, index: number) => {
          if (index % 2 === 0) {
            doc.rect(50, currentY - 3, 500, 16).fill("#fffbeb");
          }
          doc.fillColor(COLORS.text).font("Helvetica").fontSize(8);
          doc.text(p.sku, 65, currentY);
          doc.text(p.name, 150, currentY, { width: 210 });
          doc.text(p.category?.name || "N/A", 370, currentY);
          doc
            .fillColor("#b45309")
            .font("Helvetica-Bold")
            .text(`${p.stock} ${p.unit}`, 460, currentY, {
              width: 80,
              align: "right",
            });

          currentY += 18;

          if (currentY > 700) {
            doc.addPage();
            currentY = 50;
          }
        });
      }

      // --- Footer ---
      doc
        .fillColor(COLORS.muted)
        .font("Helvetica")
        .fontSize(8)
        .text("Krishi Bari Store Inventory Health Logistics Report", 50, 760, {
          align: "center",
        });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

const generateInvoice = (order: any): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = createUnlockedPdf({
        margin: 50,
        size: "A4",
        info: {
          Title: `Invoice - ${order.orderNumber}`,
          Author: "Krishi Bari",
        },
      });
      const buffers: Buffer[] = [];
      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", (err) => reject(err));

      const logoPath = path.join(
        process.cwd(),
        "src",
        "app",
        "assets",
        "logo.png",
      );
      let logoAdded = false;
      if (fs.existsSync(logoPath)) {
        try {
          doc.image(logoPath, 50, 45, { width: 40 });
          logoAdded = true;
        } catch {
          /* skip */
        }
      }
      if (logoAdded) {
        doc
          .fillColor(COLORS.primary)
          .font("Helvetica-Bold")
          .fontSize(22)
          .text("Krishi Bari", 100, 55);
      } else {
        doc
          .fillColor(COLORS.primary)
          .font("Helvetica-Bold")
          .fontSize(22)
          .text("Krishi Bari", 50, 55);
      }
      doc
        .fillColor(COLORS.text)
        .font("Helvetica")
        .fontSize(10)
        .text("Dhaka, Bangladesh", 50, 85)
        .text("support@krishibari.com", 50, 100);
      doc
        .fillColor(COLORS.secondary)
        .font("Helvetica-Bold")
        .fontSize(28)
        .text("INVOICE", 400, 55, { align: "right" });
      doc.moveDown();

      const orderInfoY = 140;
      doc.rect(50, orderInfoY, 500, 60).fill(COLORS.light);
      doc
        .fillColor(COLORS.muted)
        .font("Helvetica")
        .fontSize(9)
        .text("ORDER NUMBER", 70, orderInfoY + 15)
        .text("DATE", 200, orderInfoY + 15)
        .text("STATUS", 330, orderInfoY + 15)
        .text("PAYMENT", 450, orderInfoY + 15);
      doc
        .fillColor(COLORS.secondary)
        .font("Helvetica-Bold")
        .fontSize(10)
        .text(`#${order.orderNumber}`, 70, orderInfoY + 30)
        .text(
          new Date(order.createdAt).toLocaleDateString(),
          200,
          orderInfoY + 30,
        )
        .text(order.status, 330, orderInfoY + 30)
        .text(order.paymentMethod || "COD", 450, orderInfoY + 30);

      const customerY = 220;
      doc
        .fillColor(COLORS.muted)
        .font("Helvetica-Bold")
        .fontSize(10)
        .text("BILL TO", 50, customerY)
        .text("SHIP TO", 300, customerY);
      doc
        .fillColor(COLORS.secondary)
        .font("Helvetica-Bold")
        .fontSize(11)
        .text(order.user.name, 50, customerY + 15)
        .text(order.user.name, 300, customerY + 15);
      doc
        .fillColor(COLORS.text)
        .font("Helvetica")
        .fontSize(9)
        .text(order.user.email, 50, customerY + 30)
        .text(order.user.phone || "N/A", 50, customerY + 42);
      const addressLine = `${order.address.line1}${order.address.line2 ? ", " + order.address.line2 : ""}`;
      doc
        .text(addressLine, 300, customerY + 30, { width: 200 })
        .text(
          `${order.address.upazila.name}, ${order.address.district.name}`,
          300,
          customerY + 55,
        )
        .text(
          `${order.address.division.name}, Bangladesh`,
          300,
          customerY + 67,
        );

      const tableHeaderY = 320;
      doc.rect(50, tableHeaderY, 500, 25).fill(COLORS.secondary);
      doc
        .fillColor(COLORS.white)
        .font("Helvetica-Bold")
        .fontSize(9)
        .text("ITEM DESCRIPTION", 70, tableHeaderY + 8)
        .text("PRICE", 300, tableHeaderY + 8, { width: 60, align: "right" })
        .text("QTY", 370, tableHeaderY + 8, { width: 40, align: "right" })
        .text("TOTAL", 450, tableHeaderY + 8, { width: 80, align: "right" });

      let currentY = tableHeaderY + 35;
      doc.fillColor(COLORS.text).font("Helvetica");
      order.items.forEach((item: any, i: number) => {
        const itemTotal = item.price * item.quantity;
        // Show stored variant snapshot (immutable even if variant is later changed/deleted)
        const variantLabel = item.variantValue
          ? ` — ${item.variantName ? item.variantName + ": " : ""}${item.variantValue}`
          : "";
        if (i % 2 === 0) {
          doc.rect(50, currentY - 5, 500, 20).fill("#fcfcfc");
          doc.fillColor(COLORS.text);
        }
        doc.text(`${item.name}${variantLabel}`, 70, currentY, { width: 220 });
        doc.text(`Tk. ${item.price.toFixed(2)}`, 300, currentY, {
          width: 60,
          align: "right",
        });
        doc.text(item.quantity.toString(), 370, currentY, {
          width: 40,
          align: "right",
        });
        doc.text(`Tk. ${itemTotal.toFixed(2)}`, 450, currentY, {
          width: 80,
          align: "right",
        });
        currentY += 25;
        if (currentY > 700) {
          doc.addPage();
          currentY = 50;
        }
      });

      const summaryY = Math.max(currentY + 20, 500);
      doc.moveTo(350, summaryY).lineTo(550, summaryY).stroke(COLORS.border);
      const drawRow = (
        label: string,
        value: string,
        y: number,
        bold = false,
      ) => {
        doc
          .fillColor(bold ? COLORS.secondary : COLORS.muted)
          .font(bold ? "Helvetica-Bold" : "Helvetica")
          .fontSize(10)
          .text(label, 350, y)
          .text(value, 450, y, { width: 80, align: "right" });
      };
      drawRow("Subtotal:", `Tk. ${order.subtotal.toFixed(2)}`, summaryY + 15);
      drawRow(
        "Delivery Fee:",
        `Tk. ${order.deliveryFee.toFixed(2)}`,
        summaryY + 35,
      );
      if (order.discount > 0)
        drawRow(
          "Discount:",
          `-Tk. ${order.discount.toFixed(2)}`,
          summaryY + 55,
        );
      const finalTotalY = summaryY + (order.discount > 0 ? 80 : 60);
      doc.rect(350, finalTotalY - 10, 200, 35).fill(COLORS.primary);
      doc
        .fillColor(COLORS.white)
        .font("Helvetica-Bold")
        .fontSize(12)
        .text("TOTAL AMOUNT", 365, finalTotalY)
        .text(`Tk. ${order.total.toFixed(2)}`, 450, finalTotalY, {
          width: 80,
          align: "right",
        });

      doc
        .fillColor(COLORS.muted)
        .font("Helvetica")
        .fontSize(8)
        .text("Thank you for shopping with Krishi Bari!", 50, 750, {
          align: "center",
        })
        .text(
          "This is a computer-generated invoice. No signature required.",
          50,
          765,
          { align: "center" },
        );
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

export const pdfHelper = {
  generateInvoice,
  generateDashboardReport,
  generateSalesReport,
  generateInventoryReport,
};
