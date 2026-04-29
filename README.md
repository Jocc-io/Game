
# ⚠️ Configuration Required

> 🔐 **This application requires secure environment setup before use**

---

## ⚙️ Environment Variables

Make sure to configure the following environment variable:

```env
TREASURY_PRIVATE_KEY=your_private_key_here
```

> ⚠️ **Important:**
>
> * Never share or expose your private key.
> * Store it securely using `.env` files or a secret manager.
> * Do NOT commit this value to version control.

---

## 🔐 Security Notes

* Treat `TREASURY_PRIVATE_KEY` as highly sensitive data.
* Use environment-specific configs (e.g. `.env.local`, `.env.production`).
* Consider using vault services or encrypted secret storage in production.

---

## 💡 Usage Notes

* Ensure the variable is loaded before starting the application.
* Double-check permissions and access controls for production deployments.

---

## ❤️ Support the Developer

If you find this project helpful, consider donating:

```
5hjGR9V2g2XvRSMyj5MpwFUrsTBj7YmLppe4t8oUcz72
```

---

## 📄 License

This project is provided as-is without warranty. Use at your own risk.

