const axios = require("axios");
const PDFParser = require("pdf-parse");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;
const fs = require("fs");
const path = require("path");

async function downloadFileFromURL(url, destination) {
  const response = await axios({
    method: "GET",
    url,
    responseType: "arraybuffer",
  });

  const directory = path.dirname(destination);
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }

  fs.writeFileSync(destination, Buffer.from(response.data));

  return destination;
}

async function readPDF(filePath) {
  let dataBuffer = fs.readFileSync(filePath);
  return PDFParser(dataBuffer, { max: -1 });
}

function extractData(text) {
  const orderNumberRegex = /Order Number:\\s*(\\S+)/;
  const invoiceNumberRegex = /Invoice Number:\\s*(\\S+)/;
  const buyerNameRegex = /Buyer Name:\\s*(.+)/;
  const buyerAddressRegex = /Buyer Address:\\s*(.+)/;
  const invoiceDateRegex = /Invoice Date:\\s*(\\S+)/;
  const orderDateRegex = /Order Date:\\s*(\\S+)/;
  const productTitleRegex = /Product Title:\\s*(.+)/;
  const hsnRegex = /HSN:\\s*(\\S+)/;
  const taxableValueRegex = /Taxable Value:\\s*(\\S+)/;
  const discountRegex = /Discount:\\s*(\\S+)/;
  const taxRateCategoryRegex = /Tax Rate and Category:\\s*(.+)/;

  const extractSafe = (regex, text) => {
    const match = text.match(regex);
    return match && match[1] ? match[1].trim() : null;
  };

  // Extract data
  const orderNumber = extractSafe(orderNumberRegex, text);
  const invoiceNumber = extractSafe(invoiceNumberRegex, text);
  const buyerName = extractSafe(buyerNameRegex, text);
  const buyerAddress = extractSafe(buyerAddressRegex, text);
  const invoiceDate = extractSafe(invoiceDateRegex, text);
  const orderDate = extractSafe(orderDateRegex, text);
  const productTitle = extractSafe(productTitleRegex, text);
  const hsn = extractSafe(hsnRegex, text);
  const taxableValue = extractSafe(taxableValueRegex, text);
  const discount = extractSafe(discountRegex, text);
  const taxRateCategory = extractSafe(taxRateCategoryRegex, text);
  return {
    orderNumber,
    invoiceNumber,
    buyerName,
    buyerAddress,
    invoiceDate,
    orderDate,
    productTitle,
    hsn,
    taxableValue,
    discount,
    taxRateCategory,
  };
}

async function processPDF(url, fileId) {
  const destinationPath = `path/to/save/downloaded/file_${fileId}.pdf`;

  try {
    await downloadFileFromURL(url, destinationPath);

    const pdfData = await readPDF(destinationPath);

    console.log("PDF Content:", pdfData.text);

    const defaultValues = {
      orderNumber: "",
      invoiceNumber: "",
      buyerName: "",
      buyerAddress: "",
      invoiceDate: "",
      orderDate: "",
      productTitle: "",
      hsn: "",
      taxableValue: "",
      discount: "",
      taxRateCategory: "",
    };

    const extractedData = extractData(pdfData.text) || defaultValues;

    // Write to CSV
    const csvWriter = createCsvWriter({
      path: `output_${fileId}.csv`,
      header: [
        { id: "orderNumber", title: "Order Number" },
        { id: "invoiceNumber", title: "Invoice Number" },
        { id: "buyerName", title: "Buyer Name" },
        { id: "buyerAddress", title: "Buyer Address" },
        { id: "invoiceDate", title: "Invoice Date" },
        { id: "orderDate", title: "Order Date" },
        { id: "productTitle", title: "Product Title" },
        { id: "hsn", title: "HSN" },
        { id: "taxableValue", title: "Taxable Value" },
        { id: "discount", title: "Discount" },
        { id: "taxRateCategory", title: "Tax Rate and Category" },
      ],
    });

    await csvWriter.writeRecords([extractedData]);
    console.log(`Data from ${url} written to CSV`);
  } catch (error) {
    console.error(`Error processing ${url}:`, error);
  }
}

// Array of PDF URLs
const pdfUrls = [
  "https://s3-ap-southeast-1.amazonaws.com/meesho-supply-v2/invoices/supplierToReseller/79680d66843595689ee236af431084e20ba6e424.pdf",
  "https://s3-ap-southeast-1.amazonaws.com/meesho-supply-v2/invoices/supplierToReseller/dd887580ee6aacd9db94475997b3e2d2ceda0857.pdf",
  "https://s3-ap-southeast-1.amazonaws.com/meesho-supply-v2/invoices/supplierToReseller/a1ee39e758d5372c135b844d13e64689c79ca5ea.pdf",
  "https://s3-ap-southeast-1.amazonaws.com/meesho-supply-v2/invoices/supplierToReseller/dc4eb4a16947b518bca856337a3a4e887b153fee.pdf",
  "https://s3-ap-southeast-1.amazonaws.com/meesho-supply-v2/invoices/supplierToReseller/09ad122f555f81f6f53b6cc164165a01d541e561.pdf",
  "https://s3-ap-southeast-1.amazonaws.com/meesho-supply-v2/invoices/supplierToReseller/67a2920cce0e2ad53bc124ac5f262ac53900edf5.pdf",
  "https://s3-ap-southeast-1.amazonaws.com/meesho-supply-v2/invoices/supplierToReseller/0799127f5a121963ad9111164d922b87bd3bca8d.pdf",
  "https://s3-ap-southeast-1.amazonaws.com/meesho-supply-v2/invoices/supplierToReseller/02a6927e5375d83063d5c23ed4c14474c12ad209.pdf",
];

// Process each PDF URL
async function processPDFs() {
  for (let index = 0; index < pdfUrls.length; index++) {
    const url = pdfUrls[index];
    const fileId = `file_${index + 1}`;
    await processPDF(url, fileId);
  }
}

processPDFs();
