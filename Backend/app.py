from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os, cv2, numpy as np, uuid
from Crypto.Cipher import ChaCha20
from Crypto.Random import get_random_bytes
from Crypto.Protocol.KDF import PBKDF2

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = 'processed_images'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def generate_key(password, salt):
    return PBKDF2(password, salt, dkLen=32, count=1000)

def encrypt_chacha(text, password):
    salt = get_random_bytes(16)
    key = generate_key(password, salt)
    nonce = get_random_bytes(12)
    cipher = ChaCha20.new(key=key, nonce=nonce)
    ciphertext = cipher.encrypt(text.encode('utf-8'))
    return (nonce + salt + ciphertext).hex()

def decrypt_chacha(hex_data, password):
    raw_data = bytes.fromhex(hex_data)
    nonce, salt, ciphertext = raw_data[:12], raw_data[12:28], raw_data[28:]
    key = generate_key(password, salt)
    cipher = ChaCha20.new(key=key, nonce=nonce)
    return cipher.decrypt(ciphertext).decode('utf-8')

@app.route('/process', methods=['POST'])
def embed():
    try:
        file = request.files['image']
        msg, key = request.form.get('message'), request.form.get('key')
        x_s, y_s = int(request.form.get('x', 0)), int(request.form.get('y', 0))
        
        path = "temp_in.png"
        file.save(path)
        img = cv2.imread(path)
        h, w, c = img.shape

        # HEADER: Signature 'STG' + Coord X(4d) + Coord Y(4d)
        header_text = f"STG{str(x_s).zfill(4)}{str(y_s).zfill(4)}"
        secret_hex = encrypt_chacha(msg, key) + "54474f" 
        full_hex = header_text.encode().hex() + secret_hex
        bin_msg = bin(int(full_hex, 16))[2:].zfill(len(full_hex) * 4)

        res_img = img.copy()
        idx = 0
        for y in range(h):
            for x in range(w):
                for k in range(c):
                    if idx < len(bin_msg):
                        res_img[y, x, k] = (res_img[y, x, k] & 0xFE) | int(bin_msg[idx])
                        idx += 1
                    else: break
                if idx >= len(bin_msg): break
            if idx >= len(bin_msg): break

        fname = f"stego_{uuid.uuid4().hex[:6]}.png"
        cv2.imwrite(os.path.join(UPLOAD_FOLDER, fname), res_img)
        return jsonify({
            'psnr': f"{cv2.PSNR(img, res_img):.2f}", 
            'url': f"http://localhost:5000/download/{fname}", 
            'used_pixels': len(bin_msg)//3
        })
    except Exception as e: return jsonify({'error': str(e)}), 500

@app.route('/extract', methods=['POST'])
def extract():
    try:
        file = request.files['image']
        key = request.form.get('key')
        path = "temp_ex.png"
        file.save(path)
        img = cv2.imread(path)
        h, w, c = img.shape
        
        # Scan 8000 bit pertama untuk mencari header
        bits = ""
        idx = 0
        for y in range(h):
            for x in range(w):
                for k in range(c):
                    if idx < 8000:
                        bits += str(img[y, x, k] & 1)
                        idx += 1
                    else: break
                if idx >= 8000: break
            if idx >= 8000: break

        all_hex = hex(int(bits, 2))[2:]
        if len(all_hex) % 2 != 0: all_hex = '0' + all_hex
        all_bytes = bytes.fromhex(all_hex).decode('utf-8', errors='ignore')

        if "STG" not in all_bytes:
            return jsonify({'error': 'Signature STG tidak ditemukan!'}), 400

        start_idx = all_bytes.find("STG")
        header_str = all_bytes[start_idx:start_idx+11]
        f_x, f_y = int(header_str[3:7]), int(header_str[7:11])
        content_hex = all_hex[(start_idx + 11) * 2:]
        
        if "54474f" not in content_hex:
            return jsonify({'error': 'Data terpotong atau korup.'}), 400
            
        final_hex = content_hex.split("54474f")[0]
        msg_out = decrypt_chacha(final_hex, key)

        # --- VISUAL FORENSIC MAP ---
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        gray = cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR)
        # Highlight lokasi
        cv2.rectangle(gray, (f_x-10, f_y-10), (f_x+60, f_y+60), (255, 165, 0), 2)
        cv2.putText(gray, f"DETECTED AT {f_x},{f_y}", (f_x, f_y-20), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 165, 0), 1)
        
        map_name = f"map_{uuid.uuid4().hex[:6]}.png"
        cv2.imwrite(os.path.join(UPLOAD_FOLDER, map_name), gray)

        return jsonify({
            'message': msg_out,
            'map_url': f"http://localhost:5000/download/{map_name}",
            'coord': {'x': f_x, 'y': f_y}
        })
    except:
        return jsonify({'error': 'Gagal! Kunci salah atau gambar bukan stego.'}), 400

@app.route('/download/<f>')
def download(f): return send_from_directory(UPLOAD_FOLDER, f)

if __name__ == '__main__':
    app.run(port=5000, debug=True)