import os
import hashlib
import numpy as np
from PIL import Image
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad, unpad
from skimage.metrics import structural_similarity as ssim

def derive_key(password):
    return hashlib.sha256(password.encode()).digest()

def encrypt_aes(plaintext, password):
    key = derive_key(password)
    cipher = AES.new(key, AES.MODE_CBC)
    ct_bytes = cipher.encrypt(pad(plaintext.encode('utf-8'), AES.block_size))
    return cipher.iv + ct_bytes

def decrypt_aes(ciphertext_with_iv, password):
    try:
        key = derive_key(password)
        iv = ciphertext_with_iv[:AES.block_size]
        ct = ciphertext_with_iv[AES.block_size:]
        cipher = AES.new(key, AES.MODE_CBC, iv)
        pt = unpad(cipher.decrypt(ct), AES.block_size)
        return pt.decode('utf-8')
    except Exception as e:
        return f"[Error] Dekripsi gagal: {e}"

def logistic_map_sequence(seed_str, length, max_val):
    hash_int = int(hashlib.md5(seed_str.encode()).hexdigest(), 16)
    x = (hash_int % 10000) / 10000.0
    if x == 0: x = 0.5
    r = 3.999
    sequence = []
    
    for _ in range(100):
        x = r * x * (1 - x)
        
    for _ in range(length):
        x = r * x * (1 - x)
        sequence.append(int(x * 1000000))
        
    indices = np.array(sequence) % max_val
    unique_indices = []
    seen = set()
    
    for idx in indices:
        if idx not in seen:
            seen.add(idx)
            unique_indices.append(idx)
            
    current = 0
    while len(unique_indices) < length:
        if current not in seen:
            unique_indices.append(current)
            seen.add(current)
        current += 1
        
    return unique_indices

def embed_data(image_path, text, password, output_path):
    img = Image.open(image_path).convert('RGB')
    pixels = np.array(img)
    flat_pixels = pixels.flatten()
    
    encrypted_bytes = encrypt_aes(text, password)
    delimiter = b'::END::'
    data_to_hide = encrypted_bytes + delimiter
    binary_data = ''.join([format(b, '08b') for b in data_to_hide])
    data_len = len(binary_data)
    
    if data_len > len(flat_pixels):
        print("Kapasitas gambar tidak cukup!")
        return False
        
    print("[*] Membuat jalur chaos...")
    pixel_indices = logistic_map_sequence(password, data_len, len(flat_pixels))
    
    print("[*] Menyisipkan ciphertext...")
    for i in range(data_len):
        idx = pixel_indices[i]
        flat_pixels[idx] = (flat_pixels[idx] & 254) | int(binary_data[i])
        
    stego_pixels = flat_pixels.reshape(pixels.shape)
    stego_img = Image.fromarray(stego_pixels.astype('uint8'), 'RGB')
    stego_img.save(output_path)
    print(f"[+] Berhasil disimpan di {output_path}")
    return True

def extract_data(image_path, password):
    img = Image.open(image_path).convert('RGB')
    flat_pixels = np.array(img).flatten()
    
    delimiter = b'::END::'
    delimiter_bin = ''.join([format(b, '08b') for b in delimiter])
    
    print("[*] Merekonstruksi jalur chaos...")
    search_limit = min(len(flat_pixels), 500000) 
    pixel_indices = logistic_map_sequence(password, search_limit, len(flat_pixels))
    
    binary_data = ""
    print("[*] Mengekstraksi bit...")
    for idx in pixel_indices:
        binary_data += str(flat_pixels[idx] & 1)
        if len(binary_data) % 8 == 0 and binary_data.endswith(delimiter_bin):
            binary_data = binary_data[:-len(delimiter_bin)]
            break
            
    byte_data = bytearray()
    for i in range(0, len(binary_data), 8):
        byte_data.append(int(binary_data[i:i+8], 2))
        
    print("[*] Mendekripsi pesan...")
    return decrypt_aes(bytes(byte_data), password)

def evaluate_metrics(original_path, stego_path):
    img1 = np.array(Image.open(original_path).convert('RGB'))
    img2 = np.array(Image.open(stego_path).convert('RGB'))
    
    mse = np.mean((img1 - img2) ** 2)
    if mse == 0:
        psnr = float('inf')
    else:
        psnr = 10 * np.log10((255.0 ** 2) / mse)
        
    ssim_val = ssim(img1, img2, channel_axis=2, data_range=255)
    
    print("\n--- HASIL EVALUASI ---")
    print(f"MSE  : {mse:.4f}")
    print(f"PSNR : {psnr:.2f} dB")
    print(f"SSIM : {ssim_val:.4f}")

if __name__ == "__main__":
    print("=== HYBRID AES-256 & CHAOTIC LSB ===")
    print("1. Encode")
    print("2. Decode")
    print("3. Evaluasi")
    
    pilihan = input("Pilih menu (1/2/3): ")
    
    if pilihan == '1':
        file_cover = input("File gambar asli: ")
        file_stego = input("File output: ")
        password = input("Password: ")
        pesan = input("Pesan rahasia: ")
        embed_data(file_cover, pesan, password, file_stego)
        
    elif pilihan == '2':
        file_stego = input("File stego: ")
        password = input("Password: ")
        pesan_asli = extract_data(file_stego, password)
        print(f"\n[HASIL] Pesan Asli: {pesan_asli}")
        
    elif pilihan == '3':
        file_cover = input("File gambar asli: ")
        file_stego = input("File stego: ")
        evaluate_metrics(file_cover, file_stego)
        
    else:
        print("Pilihan tidak valid.")