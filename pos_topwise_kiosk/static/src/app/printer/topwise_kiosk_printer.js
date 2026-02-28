/** @odoo-module */

import { SelfOrder } from "@pos_self_order/app/self_order_service";
import { patch } from "@web/core/utils/patch";
import { htmlToCanvas } from "@point_of_sale/app/printer/render_service";

/**
 * Converts an HTMLElement to a base64 JPEG and sends it to the
 * Android TopWise printer via `window.TopWiseKiosk.printImage`.
 * Note: `htmlToCanvas` internally clones the element into `.render-container`
 * so the element does NOT need to be in the document at call time.
 */
async function sendToTopWisePrinter(el) {
    const canvas = await htmlToCanvas(el, { addClass: "pos-receipt-print" });
    const base64Image = canvas.toDataURL("image/jpeg").replace("data:image/jpeg;base64,", "");
    window.TopWiseKiosk.printImage(base64Image);
}

/**
 * Clones the receipt element and strips all monetary information,
 * producing a "Kitchen / Prep Ticket" DOM node suitable for printing.
 */
function buildKitchenReceipt(receiptEl) {
    const clone = receiptEl.cloneNode(true);

    // Add a clearly visible "PREP TICKET" heading at the top
    const title = document.createElement("h2");
    title.style.cssText = "text-align:center; font-weight:bold; font-size:28px; "
        + "padding:8px 0; border-bottom:2px dashed #000; margin-bottom:8px;";
    title.textContent = "TICKET DE PREPARACIÓN";
    clone.prepend(title);

    // Remove per-line price badges (right-aligned price column)
    clone.querySelectorAll(".product-price, .price").forEach(el => el.remove());

    // On each ".price-per-unit" line keep only the quantity badge, strip unit prices
    // Original: <span class="qty ...">1</span> x $3.63 / Unidades
    clone.querySelectorAll(".price-per-unit").forEach(el => {
        const qtySpan = el.querySelector(".qty");
        el.innerHTML = "";
        if (qtySpan) {
            qtySpan.style.fontSize = "20px";
            el.appendChild(qtySpan);
        }
    });

    // Remove: tax breakdown section
    clone.querySelectorAll(".pos-receipt-taxes").forEach(el => el.remove());

    // Remove: TOTAL row
    clone.querySelectorAll(".pos-receipt-amount, .receipt-total").forEach(el => el.remove());

    // Remove: payment method lines
    clone.querySelectorAll(".pos-receipt-payment, .paymentlines").forEach(el => el.remove());

    // Remove "Powered by Odoo" footers
    clone.querySelectorAll(".pos-receipt-order-data").forEach(el => {
        if (el.querySelector("p")?.textContent.includes("Odoo")) {
            el.remove();
        }
    });

    return clone;
}

patch(SelfOrder.prototype, {
    async setup() {
        await super.setup(...arguments);

        if (window.TopWiseKiosk) {
            console.log("TopWiseKiosk: detected, setting up smart dual-receipt printer.");

            this.printer.setPrinter({
                printReceipt: async (receiptEl) => {
                    try {
                        // Detect whether the customer paid at the kiosk by
                        // looking for the payment section Odoo adds to paid receipts.
                        const paidAtKiosk = receiptEl.querySelector?.(".paymentlines") !== null;

                        if (paidAtKiosk) {
                            // 1. Print the full customer receipt
                            console.log("TopWiseKiosk: Paid at kiosk → printing FULL receipt then KITCHEN ticket.");
                            await sendToTopWisePrinter(receiptEl);
                        } else {
                            console.log("TopWiseKiosk: Pay at register → printing KITCHEN ticket only.");
                        }

                        // Always print the simplified kitchen ticket
                        const kitchenEl = buildKitchenReceipt(receiptEl);
                        await sendToTopWisePrinter(kitchenEl);

                        return { successful: true };
                    } catch (error) {
                        console.error("TopWiseKiosk: Failed to print receipt:", error);
                        return {
                            successful: false,
                            message: { title: "Printing failed", body: error.toString() }
                        };
                    }
                }
            });
        }
    }
});
