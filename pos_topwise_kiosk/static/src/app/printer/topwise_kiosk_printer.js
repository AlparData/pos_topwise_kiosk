/** @odoo-module */

import { SelfOrder } from "@pos_self_order/app/self_order_service";
import { patch } from "@web/core/utils/patch";
import { htmlToCanvas } from "@point_of_sale/app/printer/render_service";

patch(SelfOrder.prototype, {
    async setup() {
        await super.setup(...arguments);
        
        if (window.TopWiseKiosk) {
            console.log("TopWiseKiosk detected in Kiosk mode, setting up custom Image printer.");
            
            // Inject a custom printer object that fulfills the expected Interface
            this.printer.setPrinter({
                printReceipt: async (receiptHtml) => {
                    try {
                        const canvas = await htmlToCanvas(receiptHtml, { addClass: "pos-receipt-print" });
                        const base64Image = canvas.toDataURL("image/jpeg").replace("data:image/jpeg;base64,", "");
                        
                        try {
                            window.TopWiseKiosk.printImage(base64Image);
                        } catch (e) {
                            // Fallback to text printing if app not updated yet
                            console.warn("window.TopWiseKiosk.printImage failed or not found, falling back to printTicket (HTML String)", e);
                            const receiptString = receiptHtml instanceof HTMLElement ? receiptHtml.outerHTML : String(receiptHtml);
                            window.TopWiseKiosk.printTicket(receiptString);
                        }
                        
                        return { successful: true };
                    } catch (error) {
                        console.error("Failed to print via TopWise Kiosk:", error);
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
