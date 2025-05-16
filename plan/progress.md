# Writeapp

## Project Overview

Writeapp is a locally hosted web application designed to help users create consistent, well-structured CTF (Capture The Flag) writeups in Markdown. It allows users to input details about a CTF they have completed, generates a formatted Markdown file, stores the file locally, and provides an option to upload the file to a specified GitHub repository.

## Tech Stack

*   **Backend:** Node.js
*   **Frontend:** React
*   **Data Storage:** JSON files (for simplicity and local operation)

## Features (Functional Requirements)

*   **User Authentication:** Secure login with username and password.
*   **Writeup Management:**
    *   View a list of previously created Markdown writeups.
    *   Create new Markdown writeups using a dedicated form.
*   **Markdown Generation:**
    *   Form inputs include:
        *   CTF Name
        *   Date
        *   Topic
        *   Approach to solving
        *   Useful resource links
        *   Additional notes
    *   Automatically generate a `.md` file from the form inputs.
*   **Local Storage:** Save generated Markdown files to a specific local folder.
*   **GitHub Integration:** Upload Markdown files to a user-specified GitHub repository via a button click.
*   **Markdown Preview:** Allow users to preview the rendered Markdown before saving or uploading.

## Non-Functional Requirements

*   **Local Deployment:** Designed to run on `localhost` only, with no external hosting dependencies for core functionality.
*   **Cross-Platform:** Compatible with both Windows and Linux operating systems.
*   **Performance:** Fast UI interactions, aiming for <500ms for form operations.
*   **User Interface:** Clean and minimal UI built with React.
*   **Security:** Secure handling of GitHub tokens and user credentials.
*   **Modularity:** Codebase designed to be modular and extensible.
*   **Offline Capability:** Core Markdown generation and local saving functionalities will work without an internet connection.
*   **Packaging:** Ability to compile the application into a lightweight executable with minimal external dependencies.

## Application Pages

The application will consist of the following main pages/views:

1.  **Login Page:** For user authentication.
2.  **Dashboard/Writeups List Page:** Displays a list of all created writeups, allowing users to view or edit them.
3.  **Create/Edit Writeup Page:** A form-based page for inputting CTF details and generating the Markdown content.
4.  **Preview Page:** Allows users to see a live preview of the Markdown output as they type or before finalizing the writeup.

## Project Structure (Proposed)

```
writeapp/
├── backend/
│   ├── src/
│   │   ├── app.js          # Main backend application setup
│   │   ├── controllers/    # Request handlers
│   │   ├── routes/         # API routes
│   │   ├── models/         # Data models (if needed, e.g., for user auth)
│   │   └── utils/          # Utility functions (e.g., file handling, markdown generation)
│   ├── data/               # For storing JSON files (e.g., users.json, writeups_metadata.json)
│   ├── writeups/           # Default local storage for generated .md files
│   └── package.json
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── App.js          # Main React application component
│   │   ├── components/     # Reusable UI components (Form, List, Preview, etc.)
│   │   ├── pages/          # Page-level components (LoginPage, DashboardPage, CreatePage)
│   │   ├── services/       # API interaction logic (e.g., authService, writeupService)
│   │   ├── contexts/       # React Context for global state (e.g., AuthContext)
│   │   └── assets/         # Static assets like images or global styles
│   └── package.json
├── .gitignore
└── README.md
```

## Next Steps

*   Set up the initial project structure.
*   Choose and install necessary npm packages for backend (e.g., Express.js, bcrypt, jsonwebtoken, simple-git) and frontend (e.g., React Router, Axios, a Markdown renderer).
*   Develop the authentication mechanism.
*   Implement the form for creating writeups.
*   Develop Markdown generation logic.
*   Implement local file storage.
*   Integrate with the GitHub API for uploads.
*   Consider tools like Electron or Tauri for packaging into a desktop application.

```// filepath: /home/winzer/Desktop/code/projects/writeapp/README.md
# Writeapp

## Project Overview

Writeapp is a locally hosted web application designed to help users create consistent, well-structured CTF (Capture The Flag) writeups in Markdown. It allows users to input details about a CTF they have completed, generates a formatted Markdown file, stores the file locally, and provides an option to upload the file to a specified GitHub repository.

## Tech Stack

*   **Backend:** Node.js
*   **Frontend:** React
*   **Data Storage:** JSON files (for simplicity and local operation)

## Features (Functional Requirements)

*   **User Authentication:** Secure login with username and password.
*   **Writeup Management:**
    *   View a list of previously created Markdown writeups.
    *   Create new Markdown writeups using a dedicated form.
*   **Markdown Generation:**
    *   Form inputs include:
        *   CTF Name
        *   Date
        *   Topic
        *   Approach to solving
        *   Useful resource links
        *   Additional notes
    *   Automatically generate a `.md` file from the form inputs.
*   **Local Storage:** Save generated Markdown files to a specific local folder.
*   **GitHub Integration:** Upload Markdown files to a user-specified GitHub repository via a button click.
*   **Markdown Preview:** Allow users to preview the rendered Markdown before saving or uploading.

## Non-Functional Requirements

*   **Local Deployment:** Designed to run on `localhost` only, with no external hosting dependencies for core functionality.
*   **Cross-Platform:** Compatible with both Windows and Linux operating systems.
*   **Performance:** Fast UI interactions, aiming for <500ms for form operations.
*   **User Interface:** Clean and minimal UI built with React.
*   **Security:** Secure handling of GitHub tokens and user credentials.
*   **Modularity:** Codebase designed to be modular and extensible.
*   **Offline Capability:** Core Markdown generation and local saving functionalities will work without an internet connection.
*   **Packaging:** Ability to compile the application into a lightweight executable with minimal external dependencies.

## Application Pages

The application will consist of the following main pages/views:

1.  **Login Page:** For user authentication.
2.  **Dashboard/Writeups List Page:** Displays a list of all created writeups, allowing users to view or edit them.
3.  **Create/Edit Writeup Page:** A form-based page for inputting CTF details and generating the Markdown content.
4.  **Preview Page:** Allows users to see a live preview of the Markdown output as they type or before finalizing the writeup.

## Project Structure (Proposed)

```
writeapp/
├── backend/
│   ├── src/
│   │   ├── app.js          # Main backend application setup
│   │   ├── controllers/    # Request handlers
│   │   ├── routes/         # API routes
│   │   ├── models/         # Data models (if needed, e.g., for user auth)
│   │   └── utils/          # Utility functions (e.g., file handling, markdown generation)
│   ├── data/               # For storing JSON files (e.g., users.json, writeups_metadata.json)
│   ├── writeups/           # Default local storage for generated .md files
│   └── package.json
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── App.js          # Main React application component
│   │   ├── components/     # Reusable UI components (Form, List, Preview, etc.)
│   │   ├── pages/          # Page-level components (LoginPage, DashboardPage, CreatePage)
│   │   ├── services/       # API interaction logic (e.g., authService, writeupService)
│   │   ├── contexts/       # React Context for global state (e.g., AuthContext)
│   │   └── assets/         # Static assets like images or global styles
│   └── package.json
├── .gitignore
└── README.md
```

## Next Steps

*   Set up the initial project structure.
*   Choose and install necessary npm packages for backend (e.g., Express.js, bcrypt, jsonwebtoken, simple-git) and frontend (e.g., React Router, Axios, a Markdown renderer).
*   Develop the authentication mechanism.
*   Implement the form for creating writeups.
*   Develop Markdown generation logic.
*   Implement local file storage.
*   Integrate with the GitHub API for uploads.
*   Consider tools like Electron or Tauri for packaging into a desktop application.
