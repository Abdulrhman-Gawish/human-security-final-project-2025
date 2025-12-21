import pandas as pd
import requests
from dotenv import load_dotenv

load_dotenv()

KEYCLOAK_URL = "http://localhost:8080"
REALM = "library-realm"

ADMIN_USERNAME = "gawish"
ADMIN_PASSWORD = "Gg552221"
ADMIN_CLIENT_ID = "admin-cli"


def get_admin_token():
    url = f"{KEYCLOAK_URL}/realms/master/protocol/openid-connect/token"
    data = {
        "grant_type": "password",
        "client_id": ADMIN_CLIENT_ID,
        "username": ADMIN_USERNAME,
        "password": ADMIN_PASSWORD
    }
    headers = {"Content-Type": "application/x-www-form-urlencoded"}

    response = requests.post(url, data=data, headers=headers)
    response.raise_for_status()
    return response.json()["access_token"]


def get_user_id(token, username):
    """
    Used only when user already exists (409 conflict).
    """
    url = f"{KEYCLOAK_URL}/admin/realms/{REALM}/users"
    headers = {"Authorization": f"Bearer {token}"}
    params = {"username": username}

    response = requests.get(url, headers=headers, params=params)
    response.raise_for_status()
    users = response.json()

    if not users:
        raise Exception(f"Existing user not found: {username}")

    return users[0]["id"]


def create_user(token, user):
    """
    Creates a user and returns the Keycloak user ID.
    Uses Location header (reliable & instant).
    """
    url = f"{KEYCLOAK_URL}/admin/realms/{REALM}/users"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    payload = {
        "username": user["username"],
        "email": user["email"],
        "firstName": user["username"],
        "lastName": user["lastName"],
        "enabled": True,
        "emailVerified": True,
        "credentials": [
            {
                "type": "password",
                "value": user["password"],
                "temporary": False
            }
        ]
    }

    response = requests.post(url, json=payload, headers=headers)

    if response.status_code == 201:
        location = response.headers.get("Location")
        user_id = location.split("/")[-1]
        print(f"User created: {user['username']}")
        return user_id

    elif response.status_code == 409:
        print(f"User already exists: {user['username']}")
        return get_user_id(token, user["username"])

    else:
        raise Exception(
            f"Failed to create user {user['username']}: {response.text}"
        )


def ensure_realm_role(token, role_name):
    url = f"{KEYCLOAK_URL}/admin/realms/{REALM}/roles/{role_name}"
    headers = {"Authorization": f"Bearer {token}"}

    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        return response.json()

    create_url = f"{KEYCLOAK_URL}/admin/realms/{REALM}/roles"
    payload = {"name": role_name}

    response = requests.post(create_url, json=payload, headers=headers)
    if response.status_code not in (201, 204):
        raise Exception(f"Failed to create role {role_name}: {response.text}")

    print(f"Role created: {role_name}")

    response = requests.get(url, headers=headers)
    response.raise_for_status()
    return response.json()


def assign_role_by_id(token, user_id, role_name, username):
    role_data = ensure_realm_role(token, role_name)

    url = f"{KEYCLOAK_URL}/admin/realms/{REALM}/users/{user_id}/role-mappings/realm"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    response = requests.post(url, json=[role_data], headers=headers)

    if response.status_code == 204:
        print(f"Role {role_name} assigned to {username}")
    else:
        raise Exception(
            f"Failed to assign role {role_name} to {username}: {response.text}"
        )


if __name__ == "__main__":
    print(" Starting Keycloak user import...\n")

    df = pd.read_csv("users.csv", encoding="utf-8")

    token = get_admin_token()

    for _, row in df.iterrows():
        user = row.to_dict()
        user_id = create_user(token, user)
        assign_role_by_id(token, user_id, user["role"], user["username"])

    print("\n Users import completed successfully.")
