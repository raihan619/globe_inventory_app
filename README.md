# Globe Decorators - Curtain Inventory Management App

## Overview

This is an inventory management application designed for Globe Decorators, primarily focusing on managing curtains and other fabrics. However, it can be extended to manage other types of items in the future.

## Features

*   **Dashboard:** Provides a summary view of the inventory with a search functionality.
*   **Inventory Management:**
    *   Add new items (rolls or cut pieces) with details like name, design, color, and length.
    *   Cut fabric from existing rolls.
    *   Bulk upload inventory data from Excel files (.xlsx or .csv).
    *   Edit and delete existing inventory items.
*   **Orders:** (Coming Soon) - A section to manage customer orders.
*   **Reports:** Displays an activity log of all inventory-related actions.

## Technologies Used

*   HTML, CSS, and JavaScript for the user interface.
*   Firebase:
    *   Firestore for real-time data storage.
*   SheetJS:
    *   For parsing Excel files for bulk inventory upload.
*   Font Awesome:
    *   For icons.

## Setup Instructions

1.  **Firebase Configuration:**
    *   Replace the placeholder values in the `firebaseConfig` object within `script.js` with your actual Firebase project configuration.
    *   Ensure that you have enabled Firestore in your Firebase project.
2.  **Include Firebase and SheetJS Libraries:**
    *   The application uses Firebase SDK and SheetJS library, which are included in the `index.html` file.

## Usage

1.  **Access the Application:**
    *   Open the `index.html` file in your web browser.
2.  **Navigate the Tabs:**
    *   Use the top navigation bar to switch between the Dashboard, Inventory, Orders, and Reports sections.
3.  **Manage Inventory:**
    *   In the Inventory tab, you can add new items, cut fabric from rolls, upload inventory from Excel, and edit/delete existing items.
4.  **Search Inventory:**
    *   Use the search bar on the Dashboard to quickly find items by name, design, or color.
5.  **View Activity Log:**
    *   The Reports tab displays a log of all inventory-related activities.

## Excel Upload Template

*   You can download an Excel template (`inventory_template.csv`) from the Inventory tab to ensure the correct format for bulk inventory uploads.

## Notes

*   The Orders section is currently under development and will be available in a future update.
*   Ensure that you have the necessary permissions configured in your Firebase project to access Firestore.

## Author

Globe Decorators
