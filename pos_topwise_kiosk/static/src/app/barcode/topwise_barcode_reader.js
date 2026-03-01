/** @odoo-module */

import { BarcodeReader } from "@point_of_sale/app/barcode/barcode_reader_service";
import { patch } from "@web/core/utils/patch";

patch(BarcodeReader.prototype, {
    setup() {
        super.setup(...arguments);
        
        // Register the global callback for the Android JSBridge
        if (window.TopWiseKiosk) {
            console.log("Registering TopWise Scanner Callback");
            window.onBarcodeScanned = (barcode) => {
                console.log("Barcode received from TopWise Scanner:", barcode);
                // In Odoo, barcodes are usually processed by passing them to the scan function
                this.scan(barcode);
            };
        }
    },
    
    /**
     * Optional: If you want to trigger the camera scanner via a button or action
     * You can add a method here that calls window.TopWiseKiosk.startScanner()
     */
    startTopWiseScanner() {
        if (window.TopWiseKiosk) {
            window.TopWiseKiosk.startScanner();
        } else {
            console.warn("TopWiseKiosk not found");
        }
    }
});
