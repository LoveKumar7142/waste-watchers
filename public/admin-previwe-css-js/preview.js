// Function to open the modal and show the complaint details
function viewComplaint(id) {
    // Find the complaint by ID
    const complaint = complaintsData.find(c => c.id === id);

    // Populate modal with complaint details
    if (complaint) {
        document.getElementById("modalDescription1").textContent = complaint.complaint;
        document.getElementById("modalAddress1").textContent = "Address: " + complaint.address;
        document.getElementById("modalCreatedAt1").textContent = "Created At: " + complaint.created_at;
        document.getElementById("modalLatitude1").textContent = "Latitude: " + complaint.latitude;
        document.getElementById("modalLongitude1").textContent = "Longitude: " + complaint.longitude;

        const imagePath = complaint.image_path || '';
        const modalImage = document.getElementById("modalImage1");

        if (imagePath) {
            modalImage.src = imagePath;
            modalImage.style.display = "block"; // Show the image if it exists
        } else {
            modalImage.style.display = "none"; // Hide the image if it doesn't exist
        }

        // Show the modal
        document.getElementById("complaintModal1").style.display = "block";
    }
}

// Function to close the modal
function closeModal() {
    document.getElementById("complaintModal1").style.display = "none";
}


function closeModal() {
    document.getElementById("complaintModal1").style.display = "none";
}

function deleteComplaints(id) {
    if (confirm('Are you sure you want to delete this complaint?')) {
        fetch(`/deleteComplaints/${id}`, { method: 'DELETE' })
            .then(response => {
                if (response.ok) {
                    const row = document.getElementById(`complaintRow1-${id}`);
                    row.remove();
                } else {
                    alert('Error deleting complaint');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Error deleting complaint');
            });
    }
}
