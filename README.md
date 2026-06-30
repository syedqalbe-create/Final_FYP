# VisionAR

VisionAR is a mobile shopping app that provides **Augmented Reality (AR)** to make online shopping better. The application allows customers to view and interact with 3D product models in their real-time environment using the phone's camera, so they can see how a product would look in their space before buying it—for example, placing furniture in their rooms with **Markerless AR**.

The app is built with **React Native** for cross-platform use; Expo Go was used in the design and testing phase. AR features are implemented with **ViroReact**, enabling Markerless AR experiences on Android devices that support ARCore. Product images and 3D models are stored in **Firebase Storage**; user data, products, reviews, chats, and wishlists are stored in **Firestore**.

**Firebase Authentication** handles secure login, sign-up, and **role-based access** via Custom Claims. Normal users and admins use the same app with different access and features: admins can add or modify products, handle reviews, and manage the app; vendors can upload or edit products; users can browse, add to wishlist, write reviews, and preview products in AR. Secure admin/vendor actions (product management, payment processing) are done through a Firebase backend and secure APIs. The app also includes simple **chat** for user–admin communication.

VisionAR aims to reduce the need for large physical showrooms by helping businesses showcase products online—a cost-effective, modern approach especially for businesses in Pakistan, connecting them with a wider audience and delivering an experiential, immersive shopping experience. *"See It. Try It. Buy It."*

---

## Tech Stack

- **App:** Bare React Native (Android), TypeScript  
- **Backend:** Firebase — **Auth**, **Firestore** (database), **Storage**  
- **AR:** **ViroReact** (@viro-community/react-viro)  
- **Navigation:** React Navigation (native-stack, bottom-tabs)

---

## FYP & Academic Use

- **University:** The University of Lahore
- **Degree:** Bachelor of Computer Science & Information Technology  
- **Batch:** Spring 2022–2026  
- **Purpose:** Academic submission and demonstration only.

---

## Privacy & Data

- No user data is shared with any third party or used outside this project.  
- No confidentiality is breached. Data (e.g. Firebase) is used only for app functionality within the scope of this academic project.
- **Payment / card data:** Card input fields in the app are for demonstration purposes only; no real payment is collected or processed.
- **User IDs & account info:** User IDs and account information are used internally for login and account management and are not shared with third parties.

*For full details and Google Play Data Safety alignment, see the [Privacy Policy](https://70131514.github.io/Shop360/).*

---

## Prerequisites (install before running)

Install the following on your machine:

| Requirement | Purpose |
|-------------|---------|
| **Node.js** (LTS) | JavaScript runtime, npm |
| **npm** | Package manager (comes with Node) |
| **JDK 17** | Java for Android build |
| **Android Studio** | Android SDK, emulator, build tools |
| **Android SDK** | Platform tools, build-tools (via Android Studio) |
| **Firebase project** | Auth, Firestore, Storage — add your `google-services.json` in `android/app/` |

Optional: **Android device or emulator** to run the app.

---

## Commands to run the project

**1. Clone and enter the repo**

```bash
git clone <repository-url>
cd Shop360
```

**2. Install dependencies**

```bash
npm install
```

**3. Configure Firebase (if not already done)**

- Create a Firebase project and enable Auth, Firestore, and Storage.
- Download `google-services.json` and place it in `android/app/`.

**4. Start Metro bundler**

```bash
npm start
```

**5. Run the app on Android** (in a new terminal)

```bash
npm run android
```

Use a connected device or a running Android emulator. The app will build and launch.

---

## License

Educational use only — FYP, Bachelor of Computer Science & Information Technology, Spring 2022–2026.
