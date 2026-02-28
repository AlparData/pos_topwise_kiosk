# -*- coding: utf-8 -*-
{
    'name': 'TopWise Kiosk Integration',
    'version': '1.0',
    'category': 'Sales/Point of Sale',
    'sequence': 6,
    'summary': 'Integrates Odoo Self Ordering with TopWise Android Kiosks via JS Bridge.',
    'description': """
This module allows Odoo POS and Self Ordering to communicate directly with TopWise Android SDK wrappers (Printers, Scanners) without requiring an IoT box.
It injects a script into the frontend that intercepts printing and routes it to `window.TopWiseKiosk.printTicket()`.
    """,
    'depends': ['point_of_sale'],
    'assets': {
        'point_of_sale._assets_pos': [
            'pos_topwise_kiosk/static/src/app/printer/topwise_printer.js',
            'pos_topwise_kiosk/static/src/app/barcode/topwise_barcode_reader.js',
        ],
    },
    'installable': True,
    'application': False,
    'auto_install': False,
    'license': 'LGPL-3',
}
