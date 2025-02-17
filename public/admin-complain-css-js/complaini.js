let map, marker;
let isMapMode = false;
let videoStream;

// Initialize the map
function initMap() {
  map = L.map("map").setView([28.6139, 77.209], 10); // Default center (New Delhi)

  // Add OpenStreetMap tiles
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "© OpenStreetMap contributors",
  }).addTo(map);

  // Initialize the marker
  marker = L.marker([28.6139, 77.209], { draggable: true }).addTo(map);

  // Event listener for map clicks
  map.on("click", (e) => {
    if (isMapMode) {
      const { lat, lng } = e.latlng;

      // Move the marker to the clicked location
      marker.setLatLng([lat, lng]);

      // Update hidden fields
      document.getElementById("latitude").value = lat;
      document.getElementById("longitude").value = lng;

      // Fetch the address for the clicked location
      fetchAddress(lat, lng);
    }
  });

  // Event listener for dragging the marker
  marker.on("moveend", () => {
    const position = marker.getLatLng();
    document.getElementById("latitude").value = position.lat;
    document.getElementById("longitude").value = position.lng;
    fetchAddress(position.lat, position.lng);
  });
}

// Get Current Location
function getCurrentLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        // Update map view and marker position
        map.setView([lat, lng], 15);
        marker.setLatLng([lat, lng]);

        // Update hidden fields
        document.getElementById("latitude").value = lat;
        document.getElementById("longitude").value = lng;

        // Fetch and auto-fill the address
        fetchAddress(lat, lng);
      },
      (error) => {
        alert("Error fetching location: " + error.message);
      }
    );
  } else {
    alert("Geolocation is not supported by your browser.");
  }
}

// Fetch the address using OpenStreetMap's Nominatim API
function fetchAddress(lat, lng) {
  fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
  )
    .then((response) => response.json())
    .then((data) => {
      const address = data.display_name || "Address not found";
      document.getElementById("address").value = address;
    })
    .catch((error) => {
      console.error("Error fetching address:", error);
      alert("Unable to fetch address.");
    });
}

// Toggle the map usage
function toggleMap() {
  isMapMode = document.getElementById("useMap").checked;
  const mapContainer = document.getElementById("map");
  if (isMapMode) {
    mapContainer.style.display = "block";
    document.getElementById("address").disabled = true;
  } else {
    mapContainer.style.display = "none";
    document.getElementById("address").disabled = false;
  }
}

// Search for location by address
function searchLocation() {
  const address = document.getElementById("address").value;
  if (address) {
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${address}`)
      .then((response) => response.json())
      .then((data) => {
        if (data.length > 0) {
          const lat = data[0].lat;
          const lon = data[0].lon;

          // Move the map to the searched location and add a marker
          map.setView([lat, lon], 15);
          marker.setLatLng([lat, lon]);

          // Update the hidden fields with the coordinates
          document.getElementById("latitude").value = lat;
          document.getElementById("longitude").value = lon;

          // Update the address input field
          document.getElementById("address").value = data[0].display_name;
        } else {
          alert("Location not found. Please try again.");
        }
      })
      .catch((error) => {
        console.error("Error searching location:", error);
        alert("Unable to search location.");
      });
  } else {
    alert("Please enter an address.");
  }
}

// Handle form submission
document.getElementById("complaintForm").onsubmit = (event) => {
  event.preventDefault(); // Prevent the form from submitting the default way

  // Validate form
  const address = document.getElementById("address").value;
  const complaint = document.getElementById("complaint").value;
  const imageFile = document.getElementById("image").files[0];

  if (!address || !complaint) {
    alert("Please complete all fields.");
    return;
  }

  // Handle image if available
  if (!imageFile) {
    alert("Please upload an image.");
    return;
  }

  // Create FormData object
  const formData = new FormData();
  formData.append("name", document.getElementById("name").value);
  formData.append("complaint", complaint);
  formData.append("address", address);
  formData.append("latitude", document.getElementById("latitude").value);
  formData.append("longitude", document.getElementById("longitude").value);
  formData.append("image", imageFile);  // Add the image file

  // Submit the complaint to the server
  fetch("/submit-complaint", {
    method: "POST",
    body: formData,
  })
    .then((response) => response.json())
    .then((data) => {
      // Check for success response from the server
      alert("Complaint submitted successfully!");
      window.location.href = "/profile"; // Redirect to profile or another page
    })
    .catch((error) => {
      // Handle any error during the request
      alert("Error submitting complaint: " + error.message);
    });
};


// Initialize map on page load
window.onload = initMap;

// Camera functionality
function openCamera() {
  const video = document.getElementById("camera");
  const constraints = { video: true };

  navigator.mediaDevices
    .getUserMedia(constraints)
    .then((stream) => {
      videoStream = stream;
      video.srcObject = stream;
      video.style.display = "block";
    })
    .catch((error) => {
      alert("Unable to access the camera: " + error.message);
    });
}

// Capture image from the camera
function captureImage() {
  const video = document.getElementById("camera");
  const canvas = document.getElementById("canvas");
  const context = canvas.getContext("2d");

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  context.drawImage(video, 0, 0);

  // Convert captured image to Blob and set it to file input
  canvas.toBlob((blob) => {
    const file = new File([blob], "captured-image.jpg", {
      type: "image/jpeg",
    });
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);

    document.getElementById("image").files = dataTransfer.files;
    alert("Image captured and added to the form!");
  });

  // Stop the camera stream after capturing
  if (videoStream) {
    videoStream.getTracks().forEach((track) => track.stop());
  }
}

