# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## iOS — App Store submission checklist

This project ships as a Capacitor iOS app. After `npx cap sync ios`, open
`ios/App/App/Info.plist` in Xcode and ensure these usage descriptions exist
(Apple rejects builds without them when the app touches camera/photos):

```xml
<key>NSCameraUsageDescription</key>
<string>Permitir acesso à câmera para tirar fotos de perfil e enviar imagens no aplicativo.</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>Permitir acesso à galeria para selecionar fotos de perfil e compartilhar imagens no aplicativo.</string>
<key>NSPhotoLibraryAddUsageDescription</key>
<string>Permitir salvar imagens geradas ou editadas pelo aplicativo na galeria.</string>
```

### Apple Guideline 3.1.1 (digital payments)

External checkout (Stripe, links de pagamento, etc.) é **proibido em iOS**.
O app detecta a plataforma via `src/lib/platform.ts` e o hook
`src/hooks/useSubscription.ts` esconde toda UI de upgrade no iOS até que
a integração StoreKit (in-app purchase) seja adicionada. Não exiba botões
"Assinar Premium" ou redirecionamentos para Stripe em builds iOS.

### Build local

```sh
npm install
npm run build
npx cap sync ios
npx cap open ios   # depois Product > Archive no Xcode
```
