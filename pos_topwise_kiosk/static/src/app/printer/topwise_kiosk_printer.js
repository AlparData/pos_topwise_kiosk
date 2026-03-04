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

// Removed buildKitchenReceipt as we now use native kitchen printers

patch(SelfOrder.prototype, {
    async setup() {
        await super.setup(...arguments);

        if (window.TopWiseKiosk) {
            console.log("TopWiseKiosk: detected, setting up smart dual-receipt printer.");

            // 1. Customer Receipt Interception
            this.printer.setPrinter({
                printReceipt: async (receiptEl) => {
                    try {
                        const paidAtKiosk = receiptEl.querySelector?.(".paymentlines") !== null;

                        if (paidAtKiosk) {
                            console.log("TopWiseKiosk: Paid at kiosk → printing CUSTOMER receipt.");
                            await sendToTopWisePrinter(receiptEl);
                        } else {
                            console.log("TopWiseKiosk: Pay at register → skipping CUSTOMER receipt.");
                        }

                        return { successful: true };
                    } catch (error) {
                        console.error("TopWiseKiosk: Failed to print customer receipt:", error);
                        return {
                            successful: false,
                            message: { title: "Printing failed", body: error.toString() }
                        };
                    }
                }
            });

            // 2. Kitchen Printer Interception
            // We intercept all kitchen printers so that the single-ticket logic
            // natively routes its outputs to the TopWise Android scanner app.
            for (const printer of this.kitchenPrinters) {
                // If the user has multiple kitchen printers (e.g. one for Food (IoT), one for Drinks Kiosk), 
                // we should theoretically only intercept the Kiosk one. 
                // For now, we route them all to TopWise to support immediate testing and direct printing.
                printer.printReceipt = async (receiptEl) => {
                    try {
                        console.log("TopWiseKiosk: Routing native kitchen printer job to TopWise!");
                        await sendToTopWisePrinter(receiptEl);
                        return { successful: true };
                    } catch (error) {
                        console.error("TopWiseKiosk: Failed to print kitchen receipt:", error);
                        return {
                            successful: false,
                            message: { title: "Kitchen Printing failed", body: error.toString() }
                        };
                    }
                };
            }
        }
    }
});
