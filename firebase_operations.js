import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";
import { getStorage, ref, listAll, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { getDatabase, ref as dbRef, onValue } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDczLLPnaREY3SahAMeKJ-DOMyVENmWwLk",
  authDomain: "crex-f9f68.firebaseapp.com",
  databaseURL: "https://crex-f9f68-default-rtdb.firebaseio.com",
  projectId: "crex-f9f68",
  storageBucket: "crex-f9f68.appspot.com",
  messagingSenderId: "209664661907",
  appId: "1:209664661907:web:933435dab65ebb20913066"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const storage = getStorage(app);
const database = getDatabase(app);


// Function to list all images
function listAllImages() {
  var listRef = ref(storage, "CartFolder/cart/");
  listAll(listRef)
    .then((res) => {
      res.items.forEach((itemRef) => {
        getDownloadURL(itemRef).then((url) => {
          checkImageAndFetchPrice(itemRef.name, url);
        });
      });
    })
    .catch((error) => {
      console.log("Error listing images: ", error);
    });
}

// Call listAllImages on page load
listAllImages();

// Function to check if an image exists in the 'bottle' folder
async function checkIfImageExistsInBottle(imageFileName) {
  try {
    const imageRef = ref(storage, 'CartFolder/Bottle/' + imageFileName);
    await getDownloadURL(imageRef); // This will throw an error if the image does not exist
    return true;
  } catch (error) {
    if (error.code === 'storage/object-not-found') {
      console.error(`Image '${imageFileName}' not found in /bottle folder.`);
    } else {
      console.error(`Error checking image '${imageFileName}' in /bottle folder.`, error);
    }
    return false;
  }
}

// Function to check if an image exists in the 'tshirt' folder
async function checkIfImageExistsInTshirt(imageFileName) {
  try {
    const imageRef = ref(storage, 'CartFolder/Tshirt/' + imageFileName);
    await getDownloadURL(imageRef); // This will throw an error if the image does not exist
    return true;
  } catch (error) {
    console.error(`Error checking image '${imageFileName}' in /tshirt folder.`, error);
    return false;
  }
}

// Function to fetch price from the database
function fetchPrice(productType) {
  return new Promise((resolve, reject) => {
    const productRef = dbRef(database, `crex/product/${productType}`);
    onValue(productRef, (snapshot) => {
      if (snapshot.exists()) {
        resolve(snapshot.val().price);
      } else {
        reject(`No data found for ${productType}`);
      }
    }, (error) => {
      reject(error);
    });
  });
}

// Function to check if the image exists in 'bottle' or 'tshirt' and fetch the price
async function checkImageAndFetchPrice(imageName, imageUrl) {
  try {
    let unitPrice = null;
    let productType = '';

    const existsInBottle = await checkIfImageExistsInBottle(imageName);
    if (existsInBottle) {
      unitPrice = await fetchPrice('bottle');
      productType = 'Bottle';
    } else {
      const existsInTshirt = await checkIfImageExistsInTshirt(imageName);
      if (existsInTshirt) {
        unitPrice = await fetchPrice('tshirt');
        productType = 'Tshirt';
      }
    }

    if (unitPrice) {
      displayImage(imageUrl, imageName, unitPrice, productType); // Pass productType to displayImage function
      updateQuantity(imageName, 0, unitPrice); // Update quantity to 1 and recalculate price and grand total
    } else {
      console.log(`Price not found for ${imageName}`);
    }
  } catch (error) {
    console.error('Error fetching price:', error);
  }
}

// Function to update quantity and recalculate price and grand total
function updateQuantity(name, change, unitPrice) {
  const quantityDisplay = document.getElementById(`quantity-${name}`);
  let quantity = parseInt(quantityDisplay.innerHTML);
  quantity = Math.max(1, quantity + change); // Ensure quantity is at least 1
  quantityDisplay.innerHTML = quantity;

  const priceDisplay = document.getElementById(`price-${name}`);
  const newPrice = unitPrice * quantity;
  priceDisplay.innerHTML = `$${newPrice.toFixed(2)}`;

  calculateGrandTotal(); // Calculate grand total after updating quantity and price
}

// Function to remove an item from Firebase Storage and from the cart table
function removeItem(row, imageName, itemTotal) {
  const imageRef = ref(storage, 'CartFolder/cart/' + imageName);

  // Delete the image from Firebase Storage
  deleteObject(imageRef).then(() => {
    console.log(`Image ${imageName} deleted successfully from Firebase Storage.`);
    row.remove();
    calculateGrandTotal(); // Recalculate grand total after removing the item
  }).catch((error) => {
    console.error(`Error deleting image '${imageName}':`, error);
  });
}

// Function to display images in the cart table
function displayImage(url, name, unitPrice, productType) {
  const tableBody = document.getElementById('cart-table').getElementsByTagName('tbody')[0];

  const row = tableBody.insertRow();

  const cellImage = row.insertCell(0);
  const cellProduct = row.insertCell(1); // New cell for product type
  const cellQuantity = row.insertCell(2);
  const cellPrice = row.insertCell(3);
  const cellButton = row.insertCell(4); // New cell for button

  const img = document.createElement("img");
  img.src = url;
  img.alt = name;
  img.width = 100; // Adjust size as needed
  cellImage.appendChild(img);

  cellProduct.innerHTML = productType; // Set product type

  const quantityContainer = document.createElement('div');
  const minusButton = document.createElement('button');
  minusButton.innerHTML = '-';
  minusButton.addEventListener('click', () => updateQuantity(name, -1, unitPrice));

  const quantityDisplay = document.createElement('span');
  quantityDisplay.id = `quantity-${name}`;
  quantityDisplay.innerHTML = '1'; // Show 1 as default quantity

  const plusButton = document.createElement('button');
  plusButton.innerHTML = '+';
  plusButton.addEventListener('click', () => updateQuantity(name, 1, unitPrice));

  quantityContainer.appendChild(minusButton);
  quantityContainer.appendChild(quantityDisplay);
  quantityContainer.appendChild(plusButton);
  cellQuantity.appendChild(quantityContainer);

  cellPrice.id = `price-${name}`;
  cellPrice.innerHTML = `$${(unitPrice * 1).toFixed(2)}`; // Display price for 1 quantity

  const removeButton = document.createElement('button'); // New remove button
  removeButton.innerHTML = 'Remove';
  removeButton.addEventListener('click', () => removeItem(row, name, unitPrice * parseInt(quantityDisplay.innerHTML)));

  cellButton.appendChild(removeButton);

  calculateGrandTotal(); // Calculate grand total after adding each item
}

// Function to calculate and display the grand total
function calculateGrandTotal() {
  const tableBody = document.getElementById('cart-table').getElementsByTagName('tbody')[0];
  let grandTotal = 0;

  for (let row of tableBody.rows) {
    const priceCell = row.cells[3];
    const price = parseFloat(priceCell.innerHTML.replace('$', ''));
    grandTotal += price;
  }

  document.getElementById('grand-total').innerHTML = `Grand Total: $${grandTotal.toFixed(2)}`;
}

function checkout() {
  // Display order successful message
  alert('Order successful!');

  // Retrieve username (assuming it's available in your application)
  const username = "JohnDoe"; // Replace with actual username retrieval logic

  // Prepare order data
  const orderData = {
    username: username,
    products: [], // This array will store details of each product in the order
    orderDate: new Date().toISOString() // Current date as ISO string
  };

  // Iterate over the table rows to gather product details
  const tableBody = document.getElementById('cart-table').getElementsByTagName('tbody')[0];
  for (let row of tableBody.rows) {
    const productName = row.cells[1].innerText; // Assuming product type is in cell 1
    const quantity = parseInt(row.cells[2].getElementsByTagName('span')[0].innerHTML); // Quantity from span in cell 2
    const unitPrice = parseFloat(row.cells[3].innerHTML.replace('$', '')); // Price from cell 3

    // Add product details to orderData
    orderData.products.push({
      productName: productName,
      quantity: quantity,
      unitPrice: unitPrice
    });
  }

  // Get a reference to the 'orders' node in Firebase Database
  const ordersRef = dbRef(database, '/orders');

  // Generate a new child node with a unique key using push()
  const newOrderRef = push(ordersRef);

  // Set the order data under the generated key
  newOrderRef.set(orderData)
    .then(() => {
      console.log('Order details added to database successfully:', orderData);

      // Clear the cart folder in Firebase Storage
      clearCartFromFirebase();

      // Clear the cart table in the UI
      tableBody.innerHTML = ''; // Clearing all rows
      document.getElementById('grand-total').innerHTML = `Grand Total: $0.00`;
    })
    .catch((error) => {
      console.error('Error adding order details to database:', error);
    });
}

function clearCartFromFirebase() {
  const cartRef = ref(storage, 'CartFolder/cart/');

  listAll(cartRef).then((res) => {
    res.items.forEach((itemRef) => {
      deleteObject(itemRef).then(() => {
        console.log(`Deleted ${itemRef.fullPath} successfully.`);
      }).catch((error) => {
        console.error(`Error deleting ${itemRef.fullPath}:`, error);
      });
    });
  }).catch((error) => {
    console.error("Error listing items in 'cart' folder:", error);
  });
}

document.getElementById('checkoutBtn').addEventListener('click', () => {
  checkout();
});

document.getElementById('backToHomeBtn').addEventListener('click', () => {
  window.location.href = 'login.html'; // Redirect to login.html
});
