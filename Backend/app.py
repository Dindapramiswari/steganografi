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

        # HEADER: Signature 'STG' + Koordinat X (4 digit) + Koordinat Y (4 digit)
        # Contoh: STG01200080 -> Mulai di X=120, Y=80
        header_text = f"STG{str(x_s).zfill(4)}{str(y_s).zfill(4)}"
        secret_hex = encrypt_chacha(msg, key) + "54474f" # 54474f = TGO (End)
        
        # Gabungkan Header (Plain) + Data (Encrypted)
        full_hex = header_text.encode().hex() + secret_hex
        bin_msg = bin(int(full_hex, 16))[2:].zfill(len(full_hex) * 4)

        res_img = img.copy()
        idx = 0
        # Selalu mulai sisipkan HEADER dari 0,0 agar Auto-Scan bisa nemu
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
        return jsonify({'psnr': f"{cv2.PSNR(img, res_img):.2f}", 'url': f"http://localhost:5000/download/{fname}", 'used_pixels': len(bin_msg)//3})
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
        
        # Baca 88 bit pertama (STG + 4 digit X + 4 digit Y = 11 karakter * 8 bit)
        bits = ""
        idx = 0
        for y in range(h):
            for x in range(w):
                for k in range(c):
                    if idx < 5000: # Ambil cukup bit untuk nyari header & data
                        bits += str(img[y, x, k] & 1)
                        idx += 1
                    else: break
                if idx >= 5000: break
            if idx >= 5000: break

        # Konversi ke Hex
        all_hex = hex(int(bits, 2))[2:]
        if len(all_hex) % 2 != 0: all_hex = '0' + all_hex
        all_bytes = bytes.fromhex(all_hex).decode('utf-8', errors='ignore')

        if "STG" not in all_bytes:
            return jsonify({'error': 'Gambar ini tidak mengandung pesan rahasia!'}), 400

        # Ambil data setelah header STGXXXXXXXX
        # Header kita 11 karakter: STG(3) + X(4) + Y(4)
        start_idx = all_bytes.find("STG")
        content_hex = all_hex[(start_idx + 11) * 2:] # Lewati header
        
        # Potong sampai Delimiter TGO (54474f)
        if "54474f" not in content_hex:
            return jsonify({'error': 'Data korup atau tidak lengkap.'}), 400
            
        final_hex = content_hex.split("54474f")[0]
        return jsonify({'message': decrypt_chacha(final_hex, key)})
    except:
        return jsonify({'error': 'Kunci salah atau data tidak dikenali.'}), 400

@app.route('/download/<f>')
def download(f): return send_from_directory(UPLOAD_FOLDER, f)

if __name__ == '__main__':
    app.run(port=5000, debug=True)