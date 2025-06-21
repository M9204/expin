import os
import glob

INVOICE_DIR = './invoices'  # Adjust if needed

def delete_all_invoices():
    if not os.path.exists(INVOICE_DIR):
        print(f`Directory '{INVOICE_DIR}' does not exist.`)
        return

    invoice_files = glob.glob(os.path.join(INVOICE_DIR, '*.json'))

    if not invoice_files:
        print("No invoice files to delete.")
        return

    for file_path in invoice_files:
        try:
            os.remove(file_path)
            print(f"Deleted: {file_path}")
        except Exception as e:
            print(f"Failed to delete {file_path}: {e}")

    print(f"Deleted {len(invoice_files)} invoice(s).")

if __name__ == '__main__':
    delete_all_invoices()
