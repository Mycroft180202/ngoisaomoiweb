import os
import re
import sys
from google_auth_oauthlib.flow import InstalledAppFlow

def main():
    env_path = ".env"
    if not os.path.exists(env_path):
        env_path = "../.env" # Fallback if run from inside backend/
        if not os.path.exists(env_path):
            print("❌ Error: .env file not found. Please make sure you have a .env file.")
            sys.exit(1)

    # Read .env to find credentials
    with open(env_path, "r", encoding="utf-8") as f:
        env_content = f.read()

    client_id_match = re.search(r"GOOGLE_CLIENT_ID=(.*)", env_content)
    client_secret_match = re.search(r"GOOGLE_CLIENT_SECRET=(.*)", env_content)

    client_id = client_id_match.group(1).strip() if client_id_match else ""
    client_secret = client_secret_match.group(1).strip() if client_secret_match else ""

    if not client_id or not client_secret:
        print("❌ Error: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing in .env file.")
        print("Please add your new credentials to your .env file first, then run this script again.")
        sys.exit(1)

    print("🔑 Google Drive OAuth2 Authorization Flow Setup")
    print(f"Using Client ID: {client_id[:25]}...")
    print("-------------------------------------------------------------")
    print("👉 IMPORTANT: Make sure your Google Console Credentials has:")
    print("   Authorized Redirect URI: http://localhost:8085/")
    print("-------------------------------------------------------------")
    
    input("Press Enter to open your browser and start authorization...")

    client_config = {
        "web": {
            "client_id": client_id,
            "client_secret": client_secret,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
        }
    }

    try:
        # Scopes to match WebAppCRM configuration
        scopes = [
            'https://www.googleapis.com/auth/drive.file',
            'https://www.googleapis.com/auth/drive.metadata.readonly'
        ]
        
        flow = InstalledAppFlow.from_client_config(client_config, scopes=scopes)
        # Run local server on port 8085
        creds = flow.run_local_server(port=8085, prompt='consent', access_type='offline')
        
        refresh_token = creds.refresh_token
        if not refresh_token:
            print("⚠️ Warning: No refresh token returned. If you have already authorized this app,")
            print("go to Google Account Settings -> Security -> Third-party apps and remove permissions")
            print("for this app, then run this script again to force consent.")
            sys.exit(1)

        print("\n✅ Authorization successful!")
        print(f"Refresh Token: {refresh_token[:15]}...")

        # Update .env file
        if "GOOGLE_REFRESH_TOKEN=" in env_content:
            new_content = re.sub(r"GOOGLE_REFRESH_TOKEN=.*", f"GOOGLE_REFRESH_TOKEN={refresh_token}", env_content)
        else:
            new_content = env_content + f"\nGOOGLE_REFRESH_TOKEN={refresh_token}\n"

        with open(env_path, "w", encoding="utf-8") as f:
            f.write(new_content)

        print(f"💾 Successfully updated {env_path} with the new GOOGLE_REFRESH_TOKEN!")

    except Exception as e:
        print(f"❌ Error during authorization: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
