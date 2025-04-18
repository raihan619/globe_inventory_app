// --- Firebase Configuration ---
// IMPORTANT: Replace the placeholder values below with your actual Firebase project configuration!
const firebaseConfig = {
  apiKey: "AIzaSyB6JDCJbIe4d9NPCEIZwlpNyG7L8UGsLDY",
  authDomain: "globe-curtaininventoryapp.firebaseapp.com",
  projectId: "globe-curtaininventoryapp",
  storageBucket: "globe-curtaininventoryapp.firebasestorage.app",
  messagingSenderId: "561209148628",
  appId: "1:561209148628:web:8a92ccb9c9103d3b9e2741"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore(); // Get Firestore instance

// Firestore collection references
const inventoryCollection = db.collection("inventory");
const activityLogCollection = db.collection("activityLog");

// --- Global variable to hold current inventory state (updated by listener) ---
let currentInventoryData = []; // Used for search and populating dropdown

// --- Helper Function ---
const formatLength = (length) => {
    if (typeof length !== 'number' || isNaN(length)) {
        return 'N/A'; // Or some other placeholder
    }
    return Math.round(length * 100) / 100;
};

// --- Activity Log (Firestore) ---

// Function to add an entry to the activity log in Firestore
async function logActivity(action, details) {
    try {
        const timestamp = firebase.firestore.FieldValue.serverTimestamp(); // Use Firestore server timestamp
        await activityLogCollection.add({
            timestamp: timestamp,
            action: action,
            details: details
        });
        console.log("Activity Logged to Firestore:", { action, details });
    } catch (error) {
        console.error("Error logging activity to Firestore: ", error);
        // Optionally display an error to the user
    }
}

// Function to display the activity log from Firestore
function displayActivityLog() {
    const logListDiv = document.getElementById('activity-log-list');
    if (!logListDiv) {
        console.error("Activity log list container not found!");
        return;
    }

    // Listen for real-time updates, ordered by timestamp descending
    activityLogCollection.orderBy("timestamp", "desc").limit(100) // Limit to latest 100 entries
        .onSnapshot(snapshot => {
            logListDiv.innerHTML = ''; // Clear previous entries
            if (snapshot.empty) {
                logListDiv.innerHTML = '<p style="padding: 15px; text-align: center; font-style: italic; color: #6c757d;">No activity recorded yet.</p>';
                return;
            }

            snapshot.forEach(doc => {
                const entry = doc.data();
                const entryDiv = document.createElement('div');
                entryDiv.classList.add('log-entry');

                const timestampSpan = document.createElement('span');
                timestampSpan.classList.add('timestamp');
                // Format Firestore timestamp (if it exists)
                timestampSpan.textContent = entry.timestamp ? entry.timestamp.toDate().toLocaleString() : 'Pending...';

                const actionSpan = document.createElement('span');
                actionSpan.classList.add('action');
                actionSpan.textContent = entry.action + ": ";

                const detailsSpan = document.createElement('span');
                detailsSpan.classList.add('details');
                detailsSpan.textContent = entry.details;

                entryDiv.appendChild(timestampSpan);
                entryDiv.appendChild(actionSpan);
                entryDiv.appendChild(detailsSpan);
                logListDiv.appendChild(entryDiv);
            });
        }, error => {
            console.error("Error fetching activity log: ", error);
            logListDiv.innerHTML = '<p style="color: red; text-align: center;">Error loading activity log.</p>';
        });
}
// --- End Activity Log ---

// --- Inventory Management (Firestore) ---

// Function to populate the roll selection dropdown from current inventory data
function populateItemSelect(inventoryItems) {
    const itemSelect = document.getElementById('item-select');
    if (!itemSelect) return; // Guard clause

    const currentSelection = itemSelect.value; // Preserve selection if possible
    itemSelect.innerHTML = '<option value="">-- Select Roll --</option>'; // Default option

    // Filter for rolls that still have length remaining
    const availableRolls = inventoryItems.filter(item => item.currentLength > 0);

    availableRolls.forEach(item => {
        const option = document.createElement('option');
        option.value = item.id; // Use Firestore document ID as the value
        // Display concise info: Name - Design - Colour (ID: ShortID, Current: Ym)
        const shortId = item.id.substring(0, 6); // Show a shorter ID for display
        option.textContent = `${item.name} - ${item.design} - ${item.colour} (${formatLength(item.currentLength)}m left)`; // Removed ID from text for clarity
        itemSelect.appendChild(option);
    });

    // Restore previous selection if it still exists
    if (availableRolls.some(item => item.id === currentSelection)) {
        itemSelect.value = currentSelection;
    }
}

// Function to display inventory from Firestore in real-time
function setupInventoryListener() {
    const inventoryListDiv = document.getElementById('inventory-list');
    if (!inventoryListDiv) {
        console.error("Inventory list container not found!");
        return;
    }

    inventoryCollection.orderBy("name").orderBy("design").orderBy("colour") // Example sorting
        .onSnapshot(snapshot => {
            inventoryListDiv.innerHTML = ''; // Clear previous content
            currentInventoryData = []; // Reset global inventory data

            if (snapshot.empty) {
                inventoryListDiv.innerHTML = '<p>Inventory is empty. Add a new roll to get started.</p>';
                populateItemSelect(currentInventoryData); // Update dropdown (will be empty)
                return;
            }

            const table = document.createElement('table');
            table.innerHTML = `
                <thead>
                    <tr>
                        <th>S/N</th>
                        <th>Name</th>
                        <th>Design</th>
                        <th>Colour</th>
                        <th>Original Length (m)</th>
                        <th>Current Length (m)</th>
                        <th>Status</th>
                        <th>ID</th>
                        <th>Actions</th> <!-- Added Actions Header -->
                    </tr>
                </thead>
                <tbody>
                </tbody>
            `;
            const tbody = table.querySelector('tbody');

            let serialNumber = 0; // Initialize counter
            snapshot.forEach(doc => { // Remove index parameter
                serialNumber++; // Increment counter for each row
                const item = doc.data();
                item.id = doc.id; // Add Firestore document ID to the item object
                currentInventoryData.push(item); // Add to global list

                const row = tbody.insertRow();
                row.innerHTML = `
                    <td>${serialNumber}</td>
                    <td>${item.name}</td>
                    <td>${item.design}</td>
                    <td>${item.colour}</td>
                    <td>${formatLength(item.originalLength)}</td>
                    <td>${formatLength(item.currentLength)}</td>
                    <td>${item.status}</td>
                    <td>${item.id.substring(0, 6)}...</td>
                    <td><button class="edit-btn" data-id="${item.id}"><i class="fas fa-edit"></i> Edit</button></td> <!-- Added Edit Button -->
                `;
            });

            inventoryListDiv.appendChild(table);
            populateItemSelect(currentInventoryData); // Update dropdown with current items
            // Trigger search update if needed (e.g., if search box has text)
            document.getElementById('search-inventory').dispatchEvent(new Event('input'));


        }, error => {
            console.error("Error fetching inventory: ", error);
            inventoryListDiv.innerHTML = '<p style="color: red; text-align: center;">Error loading inventory.</p>';
            currentInventoryData = [];
            populateItemSelect(currentInventoryData);
        });
}

// Function to add a new item (roll or cut piece) to Firestore
async function addItem(newItemData) {
    console.log("addItem called with data:", JSON.stringify(newItemData));
    const statusP = document.getElementById('add-status');
    statusP.textContent = '';

    // Validation
    const currentLengthValue = parseFloat(newItemData.currentLength);
    let originalLengthValue = NaN;
    let status = "Full";

    // Basic validation
    if (!newItemData.name || !newItemData.design || !newItemData.colour || isNaN(currentLengthValue) || currentLengthValue <= 0) {
        statusP.textContent = 'Error: Please fill Name, Design, Colour, and a valid positive Roll Length.';
        statusP.style.color = 'red';
        console.error("Validation failed (addItem - basic):", newItemData);
        return false; // Indicate failure
    }

    // Handle full roll vs cut piece logic
    if (newItemData.isFullRoll) {
        status = "Full";
        originalLengthValue = currentLengthValue;
    } else {
        status = "Cut";
        originalLengthValue = parseFloat(newItemData.originalLength);
        if (isNaN(originalLengthValue) || originalLengthValue <= 0) {
            statusP.textContent = 'Error: Please provide a valid positive Original Roll Length when adding a cut piece.';
            statusP.style.color = 'red';
            console.error("Validation failed (addItem - cut piece original length invalid):", newItemData.originalLength);
            return false;
        }
        if (currentLengthValue > originalLengthValue) {
            statusP.textContent = 'Error: Current Length cannot be greater than Original Roll Length.';
            statusP.style.color = 'red';
            console.error(`Validation failed (addItem - current > original): Current=${currentLengthValue}, Original=${originalLengthValue}`);
            return false;
        }
    }

    const itemToAdd = {
        name: newItemData.name,
        design: newItemData.design,
        colour: newItemData.colour,
        originalLength: originalLengthValue,
        currentLength: currentLengthValue,
        status: status,
        addedAt: firebase.firestore.FieldValue.serverTimestamp() // Add timestamp
    };

    console.log("Attempting to add item to Firestore:", itemToAdd);

    try {
        const docRef = await inventoryCollection.add(itemToAdd);
        console.log("Item added to Firestore with ID:", docRef.id);
        const logAction = itemToAdd.status === "Full" ? "Full Roll Added" : "Cut Piece Added";
        await logActivity(logAction, `ID: ${docRef.id.substring(0,6)}..., Name: ${itemToAdd.name}, Design: ${itemToAdd.design}, Colour: ${itemToAdd.colour}, Current Length: ${itemToAdd.currentLength}m, Original Length: ${itemToAdd.originalLength}m`);
        statusP.textContent = `Successfully added ${itemToAdd.status} Item (${itemToAdd.name} - ${itemToAdd.design}).`;
        statusP.style.color = 'green';
        return true; // Indicate success
    } catch (error) {
        console.error("Error adding item to Firestore: ", error);
        statusP.textContent = 'Error adding item to database. Please try again.';
        statusP.style.color = 'red';
        return false; // Indicate failure
    }
}

// Function to cut fabric from a specific roll in Firestore
async function cutFabric(rollId, lengthToCut) {
    const statusP = document.getElementById('update-status');
    statusP.textContent = '';

    if (!rollId) {
         statusP.textContent = 'Error: No roll selected.';
         statusP.style.color = 'red';
         return false;
    }

    const cutLength = parseFloat(lengthToCut);
    if (isNaN(cutLength) || cutLength <= 0) {
         statusP.textContent = 'Error: Please enter a valid positive length to cut.';
         statusP.style.color = 'red';
         console.error("Invalid length to cut:", lengthToCut);
         return false;
    }

    const rollRef = inventoryCollection.doc(rollId);

    try {
        const doc = await rollRef.get();
        if (!doc.exists) {
            statusP.textContent = 'Error: Roll not found in database.';
            statusP.style.color = 'red';
            console.error("Roll not found in Firestore for ID:", rollId);
            return false;
        }

        const roll = doc.data();
        if (cutLength > roll.currentLength) {
            statusP.textContent = `Error: Cannot cut ${cutLength}m. Only ${formatLength(roll.currentLength)}m available on Roll ID ${rollId.substring(0,6)}...`;
            statusP.style.color = 'red';
            console.warn(`Attempted to cut more fabric than available for roll ${rollId}`);
            return false;
        }

        // Perform the cut - Update Firestore document
        const newCurrentLength = Math.round((roll.currentLength - cutLength) * 100) / 100;
        const newStatus = newCurrentLength === 0 ? "Out of Stock" : "Cut"; // Determine new status

        await rollRef.update({
            currentLength: newCurrentLength,
            status: newStatus // Update status based on remaining length
        });

        console.log(`Cut ${cutLength}m from roll ${rollId}. New current length: ${newCurrentLength}`);
        const logMessage = newStatus === "Out of Stock"
            ? `Roll ID: ${rollId.substring(0,6)}... (${roll.name}), Cut: ${cutLength}m. Roll is out of stock.`
            : `Roll ID: ${rollId.substring(0,6)}... (${roll.name}), Cut: ${cutLength}m, Remaining: ${newCurrentLength}m`;
        await logActivity("Fabric Cut", logMessage);

        const statusMessage = newStatus === "Out of Stock"
            ? `Successfully cut ${cutLength}m from Roll (${roll.name}). Roll is now out of stock.`
            : `Successfully cut ${cutLength}m from Roll (${roll.name}). Remaining: ${newCurrentLength}m.`;
        statusP.textContent = statusMessage;
        statusP.style.color = 'green';
        return true; // Indicate success

    } catch (error) {
        console.error("Error cutting fabric: ", error);
        statusP.textContent = 'Error updating roll in database. Please try again.';
        statusP.style.color = 'red';
        return false; // Indicate failure
    }
}

// --- Excel Upload Functionality ---
async function handleExcelUpload() {
    const fileInput = document.getElementById('excel-file');
    const uploadStatusP = document.getElementById('upload-status');
    const uploadButton = document.getElementById('upload-excel-btn');

    if (!fileInput.files || fileInput.files.length === 0) {
        uploadStatusP.textContent = 'Please select an Excel file first.';
        uploadStatusP.style.color = 'orange';
        return;
    }

    const file = fileInput.files[0];
    // File type check removed - relying on the 'accept' attribute in HTML
    // and SheetJS's ability to parse both .xlsx and .csv

    uploadButton.disabled = true;
    uploadStatusP.textContent = 'Reading file...';
    uploadStatusP.style.color = 'black';

    const reader = new FileReader();

    reader.onload = async (event) => {
        try {
            const data = event.target.result;
            // Use SheetJS to parse the data
            const workbook = XLSX.read(data, { type: 'array' });

            // Assume data is in the first sheet
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];

            // Convert sheet to JSON array of objects (header row determines keys)
            // Use raw: false to attempt type conversion (numbers, dates)
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false });

            uploadStatusP.textContent = `Found ${jsonData.length} rows. Validating and preparing upload...`;

            let validItems = [];
            let errorCount = 0;
            let errorMessages = [];

            // --- Validation Loop ---
            jsonData.forEach((row, index) => {
                const rowNum = index + 2; // Excel row number (assuming header is row 1)

                // Validate expected columns and basic types
                const name = row.Name ? String(row.Name).trim() : null;
                const design = row.Design ? String(row.Design).trim() : null;
                const colour = row.Colour ? String(row.Colour).trim() : null;
                const originalLength = row.OriginalLength !== undefined ? parseFloat(row.OriginalLength) : NaN;
                const currentLength = row.CurrentLength !== undefined ? parseFloat(row.CurrentLength) : NaN;
                let status = row.Status ? String(row.Status).trim() : "Unknown"; // Default status if missing

                let rowErrors = [];
                if (!name) rowErrors.push("Missing Name");
                if (!design) rowErrors.push("Missing Design");
                if (!colour) rowErrors.push("Missing Colour");
                if (isNaN(originalLength) || originalLength <= 0) rowErrors.push("Invalid OriginalLength (must be positive number)");
                if (isNaN(currentLength) || currentLength < 0) rowErrors.push("Invalid CurrentLength (must be non-negative number)");
                if (currentLength > originalLength && !isNaN(currentLength) && !isNaN(originalLength)) rowErrors.push("CurrentLength cannot be greater than OriginalLength");

                // Normalize status (optional, adjust as needed)
                const lowerStatus = status.toLowerCase();
                if (lowerStatus === 'full' || lowerStatus === 'complete') {
                    status = 'Full';
                } else if (lowerStatus === 'cut' || lowerStatus === 'partial') {
                    status = 'Cut';
                } else if (lowerStatus === 'out of stock' || lowerStatus === 'empty' || lowerStatus === 'no stock') {
                    status = 'Out of Stock'; // Standardize empty status
                } else {
                    // If status is unrecognized, maybe default based on lengths?
                    if (!isNaN(currentLength) && !isNaN(originalLength) && currentLength === originalLength) {
                        status = 'Full';
                    } else {
                        status = 'Cut'; // Default to Cut if lengths differ or status is weird
                    }
                }


                if (rowErrors.length > 0) {
                    errorCount++;
                    errorMessages.push(`Row ${rowNum}: ${rowErrors.join(', ')}`);
                    console.warn(`Validation failed for row ${rowNum}:`, row, rowErrors);
                } else {
                    // Prepare valid item for Firestore
                    validItems.push({
                        name: name,
                        design: design,
                        colour: colour,
                        originalLength: originalLength,
                        currentLength: currentLength,
                        status: status,
                        addedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
            });
            // --- End Validation Loop ---

            if (validItems.length === 0) {
                uploadStatusP.textContent = `Upload failed. No valid items found in the file. ${errorCount} rows had errors.`;
                uploadStatusP.style.color = 'red';
                if (errorMessages.length > 0) {
                    console.error("Validation Errors:\n" + errorMessages.slice(0, 10).join('\n') + (errorMessages.length > 10 ? '\n...' : '')); // Log first 10 errors
                }
                uploadButton.disabled = false;
                fileInput.value = ''; // Clear file input
                return;
            }

            uploadStatusP.textContent = `Uploading ${validItems.length} valid items...`;

            // --- Firestore Batch Write ---
            const batch = db.batch();
            validItems.forEach(item => {
                const docRef = inventoryCollection.doc(); // Auto-generate ID
                batch.set(docRef, item);
            });

            await batch.commit();
            // --- End Batch Write ---

            uploadStatusP.textContent = `Upload complete! Successfully added ${validItems.length} items.`;
            uploadStatusP.style.color = 'green';
            await logActivity("Bulk Upload", `Uploaded ${validItems.length} items from file: ${file.name}. ${errorCount} rows skipped due to errors.`);

            if (errorCount > 0) {
                 uploadStatusP.textContent += ` ${errorCount} rows had errors and were skipped. Check console (F12) for details.`;
                 uploadStatusP.style.color = 'orange'; // Indicate partial success
                 console.error(`Excel Upload Validation Errors (${errorCount} total):\n` + errorMessages.slice(0, 20).join('\n') + (errorMessages.length > 20 ? '\n...' : '')); // Log first 20 errors
            }


        } catch (error) {
            console.error("Error processing Excel file: ", error);
            uploadStatusP.textContent = 'Error processing file. Check console (F12) for details.';
            uploadStatusP.style.color = 'red';
            await logActivity("Bulk Upload Error", `Failed to process file: ${file.name}. Error: ${error.message}`);
        } finally {
            uploadButton.disabled = false; // Re-enable button
            fileInput.value = ''; // Clear file input
        }
    };

    reader.onerror = (error) => {
        console.error("Error reading file: ", error);
        uploadStatusP.textContent = 'Error reading file.';
        uploadStatusP.style.color = 'red';
        uploadButton.disabled = false;
        fileInput.value = ''; // Clear file input
    };

    reader.readAsArrayBuffer(file); // Read file as ArrayBuffer for SheetJS
}

// --- Edit Item Functionality ---
// Function to open the modal and populate form
async function openEditModal(itemId) {
    const editModal = document.getElementById('edit-modal');
    const editForm = document.getElementById('edit-item-form');
    const editStatusP = document.getElementById('edit-status');

    if (!editModal || !editForm || !editStatusP) {
        console.error("Edit modal elements not found!");
        return;
    }
    editStatusP.textContent = ''; // Clear previous status
    editForm.reset(); // Reset form fields
    // Ensure buttons are enabled when opening
    const saveBtn = editForm.querySelector('button[type="submit"]');
    const deleteBtn = document.getElementById('delete-item-btn');
    if(saveBtn) saveBtn.disabled = false;
    if(deleteBtn) deleteBtn.disabled = false;


    try {
        const docRef = inventoryCollection.doc(itemId);
        const docSnap = await docRef.get();

        if (docSnap.exists) {
            const item = docSnap.data();
            // Populate the form
            document.getElementById('edit-item-id').value = itemId;
            document.getElementById('edit-item-name').value = item.name;
            document.getElementById('edit-item-design').value = item.design;
            document.getElementById('edit-item-colour').value = item.colour;
            document.getElementById('edit-original-length').value = item.originalLength;
            document.getElementById('edit-current-length').value = item.currentLength;
            document.getElementById('edit-item-status').value = item.status;

            editModal.style.display = "block"; // Show the modal
        } else {
            console.error("No such document!");
            alert("Error: Could not find the item to edit."); // Inform user
        }
    } catch (error) {
        console.error("Error getting document:", error);
        alert("Error fetching item details. Please try again.");
    }
}

// Function to close the modal
function closeEditModal() {
    const editModal = document.getElementById('edit-modal');
    if (editModal) {
        editModal.style.display = "none";
    }
}

// Function to handle saving edited item
async function handleEditFormSubmit(event) {
    event.preventDefault();
    const editStatusP = document.getElementById('edit-status');
    const saveBtn = document.querySelector('#edit-item-form button[type="submit"]');
    const deleteBtn = document.getElementById('delete-item-btn');

    editStatusP.textContent = 'Saving...';
    editStatusP.style.color = 'orange';
    if(saveBtn) saveBtn.disabled = true;
    if(deleteBtn) deleteBtn.disabled = true;


    const itemId = document.getElementById('edit-item-id').value;
    const originalLength = parseFloat(document.getElementById('edit-original-length').value);
    const currentLength = parseFloat(document.getElementById('edit-current-length').value);
    let status = document.getElementById('edit-item-status').value; // Use let for potential modification
    const name = document.getElementById('edit-item-name').value.trim();
    const design = document.getElementById('edit-item-design').value.trim();
    const colour = document.getElementById('edit-item-colour').value.trim();

    // Basic Validation
    if (!itemId || !name || !design || !colour || !status || isNaN(originalLength) || originalLength <= 0 || isNaN(currentLength) || currentLength < 0) {
        editStatusP.textContent = 'Error: Please fill all fields with valid values (Lengths must be numbers, Original > 0).';
        editStatusP.style.color = 'red';
        if(saveBtn) saveBtn.disabled = false; // Re-enable on validation error
        if(deleteBtn) deleteBtn.disabled = false;
        return;
    }
    if (currentLength > originalLength) {
         editStatusP.textContent = 'Error: Current Length cannot be greater than Original Length.';
         editStatusP.style.color = 'red';
         if(saveBtn) saveBtn.disabled = false; // Re-enable on validation error
         if(deleteBtn) deleteBtn.disabled = false;
         return;
    }
     // Auto-correct status based on length if inconsistent
     if (currentLength === 0 && status !== "Out of Stock") {
         console.warn("Correcting status to 'Out of Stock' because current length is 0.");
         status = "Out of Stock";
         document.getElementById('edit-item-status').value = status; // Update dropdown visually
     } else if (currentLength > 0 && status === "Out of Stock") {
         console.warn("Correcting status from 'Out of Stock' because current length is > 0.");
         status = currentLength === originalLength ? "Full" : "Cut"; // Determine correct status
         document.getElementById('edit-item-status').value = status; // Update dropdown visually
     }


    const itemUpdates = {
        name: name,
        design: design,
        colour: colour,
        originalLength: originalLength,
        currentLength: currentLength,
        status: status
        // addedAt should not be updated
    };

    try {
        const docRef = inventoryCollection.doc(itemId);
        await docRef.update(itemUpdates);

        editStatusP.textContent = 'Changes saved successfully!';
        editStatusP.style.color = 'green';
        await logActivity("Item Edited", `ID: ${itemId.substring(0,6)}..., Name: ${name}, Design: ${design}, Colour: ${colour}, Current: ${currentLength}m, Original: ${originalLength}m, Status: ${status}`);

        // Close modal after a short delay
        setTimeout(closeEditModal, 1500);

    } catch (error) {
        console.error("Error updating document: ", error);
        editStatusP.textContent = 'Error saving changes. Please try again.';
        editStatusP.style.color = 'red';
        if(saveBtn) saveBtn.disabled = false; // Re-enable on save error
        if(deleteBtn) deleteBtn.disabled = false;
    }
}

// Function to handle deleting an item
async function handleDeleteItem() {
    const itemId = document.getElementById('edit-item-id').value;
    const editStatusP = document.getElementById('edit-status');
    const itemName = document.getElementById('edit-item-name').value; // Get name for confirmation message
    const saveBtn = document.querySelector('#edit-item-form button[type="submit"]');
    const deleteBtn = document.getElementById('delete-item-btn');


    if (!itemId) {
        alert("Error: Cannot identify item to delete.");
        return;
    }

    // Confirmation dialog
    const confirmation = confirm(`Are you sure you want to permanently delete item "${itemName}" (ID: ${itemId.substring(0,6)}...)? This action cannot be undone.`);

    if (confirmation) {
        editStatusP.textContent = 'Deleting...';
        editStatusP.style.color = 'orange';
        if(deleteBtn) deleteBtn.disabled = true; // Disable button during delete
        if(saveBtn) saveBtn.disabled = true; // Disable save button too

        try {
            const docRef = inventoryCollection.doc(itemId);
            await docRef.delete();

            editStatusP.textContent = 'Item deleted successfully!';
            editStatusP.style.color = 'green';
            await logActivity("Item Deleted", `Deleted item ID: ${itemId.substring(0,6)}... (${itemName})`);

            // Close modal after a short delay
            setTimeout(closeEditModal, 1500);

        } catch (error) {
            console.error("Error deleting document: ", error);
            editStatusP.textContent = 'Error deleting item. Please try again.';
            editStatusP.style.color = 'red';
            // Re-enable buttons on error
            if(deleteBtn) deleteBtn.disabled = false;
            if(saveBtn) saveBtn.disabled = false;
        }
    } else {
        // User cancelled
        editStatusP.textContent = 'Deletion cancelled.';
        editStatusP.style.color = 'grey';
    }
}


// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    // --- Tab Navigation Logic ---
    const navLinks = document.querySelectorAll('.top-nav ul li a');
    const tabPanels = document.querySelectorAll('.tab-panel');

    navLinks.forEach(link => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            const targetId = link.getAttribute('href').substring(1) + '-panel';

            navLinks.forEach(navLink => navLink.classList.remove('active'));
            tabPanels.forEach(panel => panel.classList.remove('active-panel'));

            link.classList.add('active');
            const targetPanel = document.getElementById(targetId);
            if (targetPanel) {
                targetPanel.classList.add('active-panel');
                // If the reports tab was clicked, ensure the log display is active
                // (The listener will handle fetching/displaying)
                if (targetId === 'reports-panel') {
                   // displayActivityLog(); // Listener handles this now
                }
                 // If the inventory tab was clicked, ensure the inventory display is active
                // (The listener handles this now)
                 if (targetId === 'inventory-panel') {
                   // setupInventoryListener(); // Listener should already be active
                }
            } else {
                console.error("Target panel not found:", targetId);
            }
        });
    });
    // --- End Tab Navigation Logic ---

    // Get Form Elements
    const addItemForm = document.getElementById('add-item-form');
    const cutFabricBtn = document.getElementById('cut-fabric-btn');
    const itemSelect = document.getElementById('item-select');
    const lengthToCutInput = document.getElementById('length-to-cut');
    const cutStatusP = document.getElementById('update-status');
    const addStatusP = document.getElementById('add-status'); // Get add status paragraph
    // Get Excel Upload Elements
    const excelFileInput = document.getElementById('excel-file');
    const uploadExcelBtn = document.getElementById('upload-excel-btn');
    const uploadStatusP = document.getElementById('upload-status');
    // Get Edit Modal Elements
    const editModal = document.getElementById('edit-modal');
    const editForm = document.getElementById('edit-item-form');
    const closeModalBtn = document.querySelector('.modal .close-btn');
    const inventoryListDiv = document.getElementById('inventory-list'); // Get inventory list container
    const deleteItemBtn = document.getElementById('delete-item-btn'); // Get delete button


    // --- Add Item Form: "Is Full Roll?" Checkbox Listener ---
    const isFullRollCheckbox = document.getElementById('is-full-roll');
    const originalLengthContainer = document.getElementById('original-length-container');
    const originalLengthInput = document.getElementById('original-length');

    // Initial state based on checkbox default
     if (isFullRollCheckbox.checked) {
         originalLengthContainer.style.display = 'none';
         originalLengthInput.required = false;
     } else {
         originalLengthContainer.style.display = 'block';
         originalLengthInput.required = true;
     }


    isFullRollCheckbox.addEventListener('change', () => {
        if (isFullRollCheckbox.checked) {
            originalLengthContainer.style.display = 'none';
            originalLengthInput.required = false;
            originalLengthInput.value = '';
        } else {
            originalLengthContainer.style.display = 'block';
            originalLengthInput.required = true;
        }
    });
    // --- End Checkbox Listener ---

    // --- Initial Data Load ---
    setupInventoryListener(); // Start listening for inventory changes
    displayActivityLog(); // Start listening for activity log changes

    // --- Search Functionality ---
    const searchInput = document.getElementById('search-inventory');
    const searchResultsListDiv = document.getElementById('search-results-list');

    searchInput.addEventListener('input', () => {
        const searchTerm = searchInput.value.toLowerCase().trim();
        searchResultsListDiv.innerHTML = ''; // Clear previous results

        if (searchTerm === '') {
            return; // Exit if search term is empty
        }

        // Filter the globally stored inventory data (updated by Firestore listener)
        const filteredInventory = currentInventoryData.filter(item => {
            // Check if properties exist before calling toLowerCase
            const nameMatch = item.name && item.name.toLowerCase().includes(searchTerm);
            const designMatch = item.design && item.design.toLowerCase().includes(searchTerm);
            const colourMatch = item.colour && item.colour.toLowerCase().includes(searchTerm);
            return nameMatch || designMatch || colourMatch;
        });


        // Group results by Name-Design-Colour
        const groupedResults = {};
        if (filteredInventory.length > 0) {
            filteredInventory.forEach(item => {
                const groupKey = `${item.name}-${item.design}-${item.colour}`;
                if (!groupedResults[groupKey]) {
                    groupedResults[groupKey] = {
                        name: item.name,
                        design: item.design,
                        colour: item.colour,
                        items: [],
                        totalLength: 0
                    };
                }
                groupedResults[groupKey].items.push(item);
                // Ensure currentLength is a number before adding
                const length = typeof item.currentLength === 'number' ? item.currentLength : 0;
                groupedResults[groupKey].totalLength += length;
            });
        }

        // Display grouped results
        if (Object.keys(groupedResults).length > 0) {
            // Sort groups alphabetically (optional)
            const sortedGroupKeys = Object.keys(groupedResults).sort();

            sortedGroupKeys.forEach(key => {
                const group = groupedResults[key];

                // Create group header/summary
                const groupHeader = document.createElement('div');
                groupHeader.classList.add('search-group-header');
                groupHeader.style.fontWeight = 'bold';
                groupHeader.style.marginTop = '15px';
                groupHeader.style.marginBottom = '5px';
                groupHeader.textContent = `${group.name} - ${group.design} - ${group.colour}: Total ${formatLength(group.totalLength)}m (${group.items.length} item(s))`;
                searchResultsListDiv.appendChild(groupHeader);

                // Create container for items within the group
                const groupItemsContainer = document.createElement('div');
                groupItemsContainer.classList.add('search-group-items');
                groupItemsContainer.style.marginLeft = '20px'; // Indent items
                searchResultsListDiv.appendChild(groupItemsContainer);

                // Display individual items in the group
                group.items.forEach(item => {
                    const resultItem = document.createElement('div');
                    resultItem.classList.add('result-item');
                    resultItem.dataset.rollId = item.id; // Store the Firestore document ID
                    resultItem.style.cursor = 'pointer';
                    resultItem.style.marginBottom = '3px'; // Small space between items
                    resultItem.setAttribute('title', 'Click to select this roll for cutting');

                    // Display relevant info for individual item
                    resultItem.textContent = `ID: ${item.id.substring(0,6)}... | Current: ${formatLength(item.currentLength)}m (${item.status})`;
                    groupItemsContainer.appendChild(resultItem);
                });
            });
        } else {
            // Display 'no results' message if filteredInventory was empty
            const noResultsMessage = document.createElement('div');
            noResultsMessage.classList.add('no-results');
            noResultsMessage.textContent = 'No items match your search.';
            searchResultsListDiv.appendChild(noResultsMessage);
        }
    });
    // --- End Search ---

    // --- Click Listener for Search Results (Event Delegation) ---
    searchResultsListDiv.addEventListener('click', (event) => {
        const clickedItem = event.target.closest('.result-item');

        if (clickedItem && clickedItem.dataset.rollId) {
            const rollIdToSelect = clickedItem.dataset.rollId; // This is the Firestore ID
            console.log(`Search result clicked. Roll ID: ${rollIdToSelect}`);

            // 1. Switch to the Inventory Tab
            const inventoryNavLink = document.querySelector('.top-nav ul li a[href="#inventory"]');
            if (inventoryNavLink) {
                inventoryNavLink.click();
            } else {
                console.error("Inventory nav link not found!");
                return;
            }

            // 2. Pre-select the roll in the "Cut Fabric" dropdown
            // Use setTimeout to allow the tab switch and dropdown population (by listener) to potentially complete
            setTimeout(() => {
                const cutFormSelect = document.getElementById('item-select');
                const lengthInput = document.getElementById('length-to-cut');

                if (cutFormSelect) {
                    cutFormSelect.value = rollIdToSelect; // Set dropdown value to Firestore ID
                    console.log(`Selected Roll ID ${rollIdToSelect} in cut form dropdown.`);

                     // 3. Focus the length input field
                    if (lengthInput) {
                        lengthInput.focus();
                        console.log("Focused on length input.");
                    } else {
                         console.error("Length input field not found!");
                    }
                } else {
                    console.error("Cut form select dropdown not found!");
                }
            }, 100); // Increased delay slightly
        }
    });
    // --- End Search Result Click ---

    // --- Event Listener for the Cut Fabric Button ---
    cutFabricBtn.addEventListener('click', async () => { // Make async
        const rollId = itemSelect.value; // This is the Firestore ID
        const lengthToCutValue = lengthToCutInput.value;

        // Disable button temporarily
        cutFabricBtn.disabled = true;
        cutStatusP.textContent = 'Processing...';
        cutStatusP.style.color = 'orange';


        if (!rollId) {
            cutStatusP.textContent = 'Please select a roll to cut from.';
            cutStatusP.style.color = 'orange';
             cutFabricBtn.disabled = false;
            return;
        }
        if (lengthToCutValue === '' || parseFloat(lengthToCutValue) <= 0) {
             cutStatusP.textContent = 'Please enter a positive length to cut.';
             cutStatusP.style.color = 'orange';
              cutFabricBtn.disabled = false;
             return;
        }

        const success = await cutFabric(rollId, lengthToCutValue); // Call async function
        if (success) {
            lengthToCutInput.value = ''; // Clear input only on success
        }
         cutFabricBtn.disabled = false; // Re-enable button
    });
    // --- End Cut Fabric Button ---

    // --- Add Item Form Submission ---
    addItemForm.addEventListener('submit', async (event) => { // Make async
        event.preventDefault();
        console.log("Add Item form submitted.");

        // Disable button temporarily
        const submitButton = addItemForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        addStatusP.textContent = 'Adding...';
        addStatusP.style.color = 'orange';


        const newItemData = {
            name: document.getElementById('item-name').value.trim(),
            design: document.getElementById('item-design').value.trim(),
            colour: document.getElementById('item-colour').value.trim(),
            currentLength: document.getElementById('current-length').value,
            isFullRoll: document.getElementById('is-full-roll').checked,
            originalLength: document.getElementById('original-length').value
        };
        console.log("Form data collected:", newItemData);

        const success = await addItem(newItemData); // Call async function

        if (success) {
            addItemForm.reset(); // Clear the form on success
            // Manually reset checkbox dependent field visibility
            if (isFullRollCheckbox.checked) {
                 originalLengthContainer.style.display = 'none';
                 originalLengthInput.required = false;
            } else {
                 originalLengthContainer.style.display = 'block';
                 originalLengthInput.required = true;
            }
            console.log("Add Item form reset.");
        }
        submitButton.disabled = false; // Re-enable button
    });
    // --- End Add Item Form ---

    // --- Excel Upload Button Listener ---
    if (uploadExcelBtn) {
        uploadExcelBtn.addEventListener('click', handleExcelUpload);
    } else {
        console.error("Upload Excel button not found!");
    }
    // --- End Excel Upload Listener ---

    // --- Edit Modal Event Listeners ---
    // Event listener for edit buttons (using event delegation on the inventory list)
    if (inventoryListDiv) { // Check if inventoryListDiv exists
        inventoryListDiv.addEventListener('click', (event) => {
            if (event.target.closest('.edit-btn')) { // Check if the click was on an edit button or its icon
                const button = event.target.closest('.edit-btn');
                const itemId = button.dataset.id;
                if (itemId) {
                    openEditModal(itemId);
                }
            }
        });
    }

    // Listener for closing the modal via the 'x' button
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeEditModal);
    }

    // Close modal if user clicks outside the modal content
    if (editModal) {
        window.addEventListener('click', (event) => {
            if (event.target == editModal) {
                closeEditModal();
            }
        });
    }

    // Listener for submitting the edit form
    if (editForm) {
        editForm.addEventListener('submit', handleEditFormSubmit);
    }

    // Listener for the delete button inside the modal
    if (deleteItemBtn) {
        deleteItemBtn.addEventListener('click', handleDeleteItem);
    }
    // --- End Edit Modal Listeners ---

}); // End DOMContentLoaded