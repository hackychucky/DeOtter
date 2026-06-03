import os
import jwt
import datetime
from functools import wraps
from flask import Blueprint, request, jsonify
from db import verify_password, get_user, create_user

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")

SECRET_KEY = os.environ.get("DEOTTER_SECRET", "deotter-change-me-in-production")
TOKEN_EXPIRY_HOURS = 8


def make_token(user):
    payload = {
        "sub": user["username"],
        "role": user["role"],
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=TOKEN_EXPIRY_HOURS),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")


def decode_token(token):
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Authentication required"}), 401
        token = auth_header[7:]
        payload = decode_token(token)
        if payload is None:
            return jsonify({"error": "Invalid or expired token"}), 401
        request.current_user = payload
        return f(*args, **kwargs)
    return decorated


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    username = data.get("username", "").strip()
    password = data.get("password", "")
    if not username or not password:
        return jsonify({"error": "Username and password required"}), 400
    user = verify_password(username, password)
    if not user:
        return jsonify({"error": "Invalid credentials"}), 401
    token = make_token(user)
    return jsonify({"token": token, "username": user["username"], "role": user["role"]})


@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    username = data.get("username", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not username or not email or not password:
        return jsonify({"error": "Username, email, and password are required"}), 400
    if "@" not in email or "." not in email.split("@")[-1]:
        return jsonify({"error": "Invalid email address"}), 400

    ok, err = create_user(username, password, role="user", email=email)
    if not ok:
        return jsonify({"error": err}), 409

    user = get_user(username)
    token = make_token(user)
    return jsonify({"token": token, "username": user["username"], "role": user["role"]}), 201


@auth_bp.route("/me", methods=["GET"])
@require_auth
def me():
    payload = request.current_user
    user = get_user(payload["sub"])
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify({"username": user["username"], "role": user["role"]})
