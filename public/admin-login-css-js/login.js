// // Toggle password visibility
// function togglePassword(id, icon) {
//     const passwordField = document.getElementById(id);
//     const iconClass = icon.classList.contains('fa-eye') ? 'fa-eye-slash' : 'fa-eye';
//     icon.classList.toggle('fa-eye');
//     icon.classList.toggle('fa-eye-slash');
//     passwordField.type = passwordField.type === 'password' ? 'text' : 'password';
// }

// // Show Register Form
// function showRegister() {
//     document.getElementById("loginForm1").classList.add("hidden1");
//     document.getElementById("registerForm1").classList.remove("hidden1");
// }

// // Update the login form fields based on the selected role (Client/Officer)
// function toggleLoginFields() {
//     const role = document.getElementById('login-role').value;
//     const usernameLabel = document.getElementById('username-label');
//     const usernameInput = document.getElementById('username-input');

//     if (role === 'client') {
//         usernameLabel.textContent = 'Email / Client ID';
//         usernameInput.setAttribute('placeholder', 'Email or Client ID');
//     } else if (role === 'officer') {
//         usernameLabel.textContent = 'Email / Officer ID';
//         usernameInput.setAttribute('placeholder', 'Email or Officer ID');
//     }
// }

// // Update the register form fields based on the selected role (Client/Officer)
// function toggleRegisterFields() {
//     const registerUsernameLabel = document.getElementById('register-username-label');
//     const role = document.getElementById('register-role').value;
//     const usernameInput = document.getElementById('user-reg');

//     if (role === 'client') {
//         registerUsernameLabel.textContent = 'Email / Client ID';
//         usernameInput.setAttribute('placeholder', 'Email or Client ID');
//     } else if (role === 'officer') {
//         registerUsernameLabel.textContent = 'Email / Officer ID';
//         usernameInput.setAttribute('placeholder', 'Email or Officer ID');
//     }
// }

// // Initialize the role field on page load
// document.addEventListener('DOMContentLoaded', () => {
//     toggleLoginFields();  // Ensure the correct label is shown on page load
// });