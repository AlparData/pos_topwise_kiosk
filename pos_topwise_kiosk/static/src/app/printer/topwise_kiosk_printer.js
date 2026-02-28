/** @odoo-module */

import { SelfOrder } from "@pos_self_order/app/self_order_service";
import { patch } from "@web/core/utils/patch";
import { htmlToCanvas } from "@point_of_sale/app/printer/render_service";

/**
 * Converts an HTMLElement to a base64 JPEG string and sends it to the
 * Android TopWise printer via the `window.TopWiseKiosk.printImage` bridge.
 */
async function printElementAsImage(el) {
    const canvas = await htmlToCanvas(el, { addClass: "pos-receipt-print" });
    const base64Image = canvas.toDataURL("image/jpeg").replace("data:image/jpeg;base64,", "");
    window.TopWiseKiosk.printImage(base64Image);
}

/**
 * Takes a receipt HTMLElement and strips all monetary information from it,
 * returning a new element representing a "Kitchen / Prep Ticket".
 * It removes: prices on orderlines, tax section, total section.
 * It adds a "TICKET DE PREPARACIÓN" heading at the top.
 */
function buildKitchenReceipt(receiptEl) {
    const clone = receiptEl.cloneNode(true);

    // Add a clearly visible title at the top
    const title = document.createElement("h2");
    title.style.cssText = "text-align:center; font-weight:bold; font-size:28px; padding: 8px 0; border-bottom: 2px dashed #000; margin-bottom: 8px;";
    title.textContent = "TICKET DE PREPARACIÓN";
    clone.prepend(title);

    // Remove: price column on every orderline (right side price badge)
    clone.querySelectorAll(".product-price, .price").forEach(el => el.remove());

    // Remove: "qty x unit_price" line, keep only the qty badge
    // The structure is: <li class="price-per-unit"><span class="qty ...">1</span> x $3.63 / Unidades</li>
    clone.querySelectorAll(".price-per-unit").forEach(el => {
        // Keep only the qty span, strip the rest
        const qtySpan = el.querySelector(".qty");
        el.innerHTML = "";
        if (qtySpan) {
            qtySpan.style.fontSize = "20px";
            el.appendChild(qtySpan);
        }
    });

    // Remove: tax section (the dashed line + breakdown)
    clone.querySelectorAll(".pos-receipt-taxes").forEach(el => el.remove());

    // Remove: TOTAL line
    clone.querySelectorAll(".pos-receipt-amount, .receipt-total").forEach(el => el.remove());

    // Remove: payment lines (if any)
    clone.querySelectorAll(".pos-receipt-payment, .paymentlines").forEach(el => el.remove());

    // Remove: "Powered by Odoo" footer
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
                printReceipt: async (receiptHtml) => {
                    try {
                        // Ensure we are working with an HTMLElement
                        const el = receiptHtml instanceof HTMLElement
                            ? receiptHtml
                            : (() => {
                                const div = document.createElement("div");
                                div.innerHTML = String(receiptHtml);
                                return div.firstElementChild || div;
                              })();

                        // Detect if the customer paid at the Kiosk:
                        // Odoo includes a .paymentlines block on paid receipts.
                        const paidAtKiosk = el.querySelector(".paymentlines") !== null;

                        if (paidAtKiosk) {
                            // Print the full customer receipt first
                            console.log("TopWiseKiosk: Paid at kiosk. Printing FULL receipt + KITCHEN receipt.");
                            await printElementAsImage(el);
                        } else {
                            console.log("TopWiseKiosk: Pay at register. Printing KITCHEN receipt only.");
                        }

                        // Always print the simplified kitchen ticket
                        const kitchenEl = buildKitchenReceipt(el);
                        // Temporarily attach to DOM so htmlToCanvas can render it
                        kitchenEl.style.cssText = "position:fixed; left:-9999px; top:0; width:400px; background:white;";
                        document.body.appendChild(kitchenEl);
                        try {
                            await printElementAsImage(kitchenEl);
                        } finally {
                            document.body.removeChild(kitchenEl);
                        }

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
