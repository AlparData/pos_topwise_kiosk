/** @odoo-module */

import { SelfOrder } from "@pos_self_order/app/self_order_service";
import { patch } from "@web/core/utils/patch";

patch(SelfOrder.prototype, {
    async setup() {
        await super.setup(...arguments);
        
        if (window.TopWiseKiosk) {
            console.log("TopWiseKiosk detected in Kiosk mode, setting up custom printer.");
            
            // Inject a custom printer object that fulfills the expected Interface
            this.printer.setPrinter({
                printReceipt: async (receiptHtml) => {
                    try {
                        const receiptString = receiptHtml instanceof HTMLElement ? receiptHtml.outerHTML : String(receiptHtml);
                        window.TopWiseKiosk.printTicket(receiptString);
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
