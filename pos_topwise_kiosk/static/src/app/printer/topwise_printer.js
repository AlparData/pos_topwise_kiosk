/** @odoo-module */

import { Printer } from "@point_of_sale/app/printer/printer";
import { patch } from "@web/core/utils/patch";

patch(Printer.prototype, {
    /**
     * Override printReceipt to intercept and send to TopWise Kiosk if present.
     */
    async printReceipt(receipt) {
        if (window.TopWiseKiosk) {
            console.log("TopWiseKiosk detected, sending print job to Android Wrapper.");
            try {
                // Receipt is usually an HTML string from the QWeb template
                window.TopWiseKiosk.printTicket(receipt);
                return true;
            } catch (error) {
                console.error("Failed to print via TopWise Kiosk:", error);
                return false;
            }
        }
        
        // Fallback to standard Odoo printing behavior (IoT Box / ePos)
        return super.printReceipt(...arguments);
    },

    /**
     * Override openCashbox if needed for cash drawer
     */
    async openCashbox() {
        // If TopWise device has a cash drawer, you could call a bridge method here.
        if (window.TopWiseKiosk && window.TopWiseKiosk.openCashbox) {
             window.TopWiseKiosk.openCashbox();
             return true;
        }
        return super.openCashbox(...arguments);
    }
});
