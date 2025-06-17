# File Insights ✨

File Insights is a web application designed to help users extract valuable information from their documents. Users can upload files (images, PDFs), extract text using AI-powered OCR, search for specific keywords, and export the structured data as a JSON file.

## Core Features 🚀

*   **📄 File Upload**: Supports uploading various file types, primarily images (JPEG, PNG) and PDF documents.
*   **👁️ AI-Powered Text Extraction (OCR)**: Leverages Google's Gemini AI to accurately extract text from uploaded images.
*   **🔍 Keyword Search & Analysis**:
    *   Users define a list of keywords to search within the extracted text.
    *   The application identifies which keywords are present.
    *   AI suggests additional relevant keywords based on the content.
    *   Extracts values or phrases associated with the found keywords.
*   **📊 Structured Data Output**: Organizes the extracted text, summaries, and keyword analysis into a predefined JSON structure.
*   **💾 JSON Export**: Allows users to download the processed data as a JSON file.
*   **☁️ Firebase Firestore Integration**: Users can save their generated reports to a Firestore database.
*   **🌐 Internationalization (i18n)**: Currently supports Portuguese (Brazil) - `pt_BR`.

## Tech Stack 🛠️

*   **Frontend**:
    *   [Next.js](https://nextjs.org/) (v15+ with App Router)
    *   [React](https://reactjs.org/) (v18+)
    *   [TypeScript](https://www.typescriptlang.org/)
    *   [Tailwind CSS](https://tailwindcss.com/) for styling
    *   [ShadCN UI](https://ui.shadcn.com/) for pre-built UI components
    *   [Lucide React](https://lucide.dev/) for icons
    *   `react-i18next` for internationalization
*   **AI Integration**:
    *   [Google AI SDK (Gemini)](https://ai.google.dev/sdks) for OCR, text summarization, keyword enrichment, and value extraction.
*   **Backend & Hosting**:
    *   [Firebase Hosting](https://firebase.google.com/docs/hosting) for deploying the static Next.js application.
    *   [Firebase Firestore](https://firebase.google.com/docs/firestore) for storing generated reports.
*   **Development Tools**:
    *   `eslint`, `prettier` (implied by Next.js setup)
    *   Git & GitHub

## Project Structure 📁

```
.
├── .firebase/          # Firebase project artifacts (auto-generated, gitignored)
├── .vscode/            # VS Code specific settings (e.g., tasks)
├── functions/          # Firebase Functions (source in src/, builds to lib/)
│   ├── src/index.ts
│   ├── package.json
│   └── tsconfig.json
├── out/                # Static export output from `next build` (gitignored)
├── public/             # Static assets (served from root)
├── src/
│   ├── app/            # Next.js App Router (pages, layouts, etc.)
│   │   ├── i18n/       # Internationalization settings
│   │   ├── (locale)/   # Locale-specific route groups (if used)
│   │   ├── globals.css # Global styles & ShadCN theme
│   │   ├── layout.tsx  # Root layout
│   │   └── page.tsx    # Main page component
│   ├── components/     # Reusable React components
│   │   ├── ui/         # ShadCN UI components
│   │   └── ...         # Custom components (file-input-area, keyword-entry, etc.)
│   ├── hooks/          # Custom React hooks (e.g., useToast)
│   ├── lib/            # Utility functions (e.g., cn for Tailwind)
│   └── locales/        # Translation files (e.g., pt_br/common.json)
├── .env                # Environment variables (template, actual values in .env.local)
├── .gitignore          # Specifies intentionally untracked files
├── apphosting.yaml     # Firebase App Hosting configuration
├── components.json     # ShadCN UI configuration
├── firebase.json       # Firebase project configuration (hosting, functions)
├── firestore.indexes.json # Firestore index definitions
├── next.config.ts      # Next.js configuration
├── package.json        # Project dependencies and scripts
├── tailwind.config.ts  # Tailwind CSS configuration
├── tsconfig.json       # TypeScript configuration
└── README.md           # This file
```

## Getting Started 🚀

### Prerequisites

*   Node.js (LTS version recommended, e.g., v20+)
*   npm or yarn
*   Firebase CLI: `npm install -g firebase-tools`
*   A Google AI Studio API Key for Gemini.
*   A Firebase project.

### Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/theocarranza/ai-ocr-report.git
    cd ai-ocr-report
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    # yarn install
    ```

3.  **Set up Environment Variables:**
    Create a `.env.local` file in the root of the project. This file is ignored by Git and should contain your sensitive keys.
    Populate it with your Google AI API Key and Firebase project configuration:

    ```env
    # Google AI API Key
    NEXT_PUBLIC_GEMINI_API_KEY="YOUR_GOOGLE_AI_STUDIO_API_KEY"

    # Firebase Configuration (get these from your Firebase project settings)
    NEXT_PUBLIC_FIREBASE_API_KEY="YOUR_FIREBASE_API_KEY"
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-project-id.firebaseapp.com"
    NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-project-id"
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your-project-id.appspot.com"
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="your-sender-id"
    NEXT_PUBLIC_FIREBASE_APP_ID="your-app-id"
    # NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID="your-measurement-id" # Optional, if using Analytics
    ```

4.  **Firebase Setup (if not already done):**
    *   Log in to Firebase:
        ```bash
        firebase login
        ```
    *   Initialize Firebase in your project directory (if this project wasn't cloned from a Firebase-initialized repo). However, since `firebase.json` exists, you might just need to associate it with your project:
        ```bash
        firebase use --add
        ```
        And select your Firebase project.

### Running Locally

To start the development server:
```bash
npm run dev
```
The application will typically be available at `http://localhost:9002` (or another port if 9002 is busy).

### Building for Production

To create a production build (static export):
```bash
npm run build
```
This will generate static files in the `out/` directory.

## Deployment 🌐

This project is configured for deployment to **Firebase Hosting**.

1.  **Build the application:**
    ```bash
    npm run build
    ```

2.  **Deploy to Firebase Hosting:**
    ```bash
    firebase deploy --only hosting
    ```
    If you also have Firebase Functions:
    ```bash
    firebase deploy
    ```

## Usage 💡

1.  **Navigate** to the application in your browser.
2.  **Enter your Google AI (Gemini) API Key** in the designated input field. This is required for AI functionalities.
3.  **Provide Input**:
    *   **File Upload**: Click "Choose Files" to select image(s) or PDF(s). The selected files will be listed.
    *   **Paste Text**: Alternatively, switch to the "Paste Text" tab and paste your text content directly into the textarea.
4.  **Define Keywords**: In the "Define Keywords" section, enter a comma-separated list of keywords you want to search for in the document(s)/text.
    *   You can use suggestions from your keyword history.
5.  **Generate Report**: Click the "Gerar Relatório" (Generate Report) button.
6.  **Review Results**: The application will process the input and display:
    *   A summary of the content.
    *   Your original keywords.
    *   Keywords found in the text.
    *   AI-suggested additional keywords.
    *   Values or phrases extracted for each found keyword.
    *   The full structured JSON output.
7.  **Export/Save**:
    *   Click "Baixar JSON" (Download JSON) to save the results locally.
    *   Click "Salvar no Firebase" (Save to Firebase) to store the report in your configured Firestore database (in the "reports" collection).

## Contributing 🤝

Contributions are welcome! If you have suggestions or want to improve the app, please feel free to:

1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/AmazingFeature`).
3.  Make your changes.
4.  Commit your changes (`git commit -m 'Add some AmazingFeature'`).
5.  Push to the branch (`git push origin feature/AmazingFeature`).
6.  Open a Pull Request.

## License 📄

This project is currently unlicensed. (You can add a license if you wish, e.g., MIT License).

---

Happy Analyzing! 🎉
