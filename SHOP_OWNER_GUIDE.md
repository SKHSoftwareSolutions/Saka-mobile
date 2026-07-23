# Mobile Hub POS - Shop Owner Guide

## How to open the app

1. Double-click the **Mobile Hub POS** icon on your desktop or Start Menu.
2. The app will open to the Dashboard. If this is the first time, it sets up your data folder automatically at `D:\MobileHubPOS` (or `Documents\MobileHubPOS` if there is no D: drive).
3. You can change where your data is stored in **Settings > Data Folder**.

---

## How to back up your data (daily recommended)

### Automatic backup
The app creates a backup every time you close it. You don't need to do anything.

### Manual backup to a USB drive
1. Plug in a USB drive.
2. Open the app and go to **Settings**.
3. Click **Backup to USB / External Drive**.
4. Choose the USB drive as the destination folder.
5. Wait for the confirmation message.

Your backup is a folder called `MobileHubPOS` containing your database and all previous backups. You can copy this folder to keep it safe.

### Using the in-app backup list
1. Go to **Settings > Backup**.
2. Click **Backup Now** to create a new backup immediately.
3. The list below shows all existing backups with dates and sizes.

---

## How to move to a new computer

1. **On the old computer:**
   - Plug in a USB drive.
   - Go to **Settings** and click **Backup to USB / External Drive**.
   - Choose the USB drive. Wait for it to finish.
   - Safely remove the USB drive.

2. **On the new computer:**
   - Install Mobile Hub POS from the installer file (Mobile Hub POS Setup.exe).
   - Open the app. It will start with an empty database.
   - Plug in the USB drive.
   - Copy the `MobileHubPOS` folder from the USB to somewhere safe on the new computer (for example, `D:\MobileHubPOS`).
   - Go to **Settings > Data Folder** and click **Change Data Folder**.
   - Select the folder where you copied your data.
   - The app will restart and load all your old data.

**Your products, phones, customers, sales history, and purchase records are all preserved.**

---

## If something goes wrong

- **If the app freezes:** Close it from the taskbar or Task Manager, then reopen. Your last backup is safe.
- **If you see "Something went wrong":** Click **Restart App**. If the error keeps happening, note down what you were doing and contact support.
- **Error logs:** If support asks for them, look for `error.log` in your data folder (`D:\MobileHubPOS\error.log`).

### Contact

For support, contact **Saka Mobile** at the number or email provided with your purchase.

---

## Your data folder

Your data is stored in a single folder. By default this is:

- `D:\MobileHubPOS` (if you have a D: drive)
- `C:\Users\<Your Name>\Documents\MobileHubPOS` (otherwise)

Inside that folder you will find:
- `store.db` - your main database
- `backups/` - automatic and manual backups
- `error.log` - error logs (if any occur)
- `config.json` - app settings

**Do not delete or rename these files while the app is running.**
