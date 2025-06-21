import os
import glob
import shutil

INVOICE_DIR = './invoices'
BACKUP_DIR = './backup_txt'

def list_invoice_files():
    return glob.glob(os.path.join(INVOICE_DIR, '*.json'))

def save_as_txt(invoice_files):
    if not os.path.exists(BACKUP_DIR):
        os.makedirs(BACKUP_DIR)
    for path in invoice_files:
        try:
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            txt_filename = os.path.splitext(os.path.basename(path))[0] + '.txt'
            with open(os.path.join(BACKUP_DIR, txt_filename), 'w', encoding='utf-8') as f:
                f.write(content)
            print("Downloaded as text:", txt_filename)
        except Exception as e:
            print("Failed to download {}: {}".format(path, e))

def delete_files(invoice_files):
    for path in invoice_files:
        try:
            os.remove(path)
            print("Deleted:", path)
        except Exception as e:
            print("Failed to delete {}: {}".format(path, e))

def main():
    if not os.path.exists(INVOICE_DIR):
        print("Directory '{}' does not exist.".format(INVOICE_DIR))
        return

    invoice_files = list_invoice_files()
    if not invoice_files:
        print("No invoices found.")
        return

    print("Found {} invoice(s).".format(len(invoice_files)))
    print("Choose an option:")
    print("1. Download all as text")
    print("2. Delete all invoices")
    print("3. Download as text then delete")
    user_input = input("Enter your choice (1/2/3): ").strip()
    try:
        choice = int(user_input)
    except ValueError:
        choice = 0  # Invalid input fallback

    if choice == 1:
        download_invoices(files)
    elif choice == 2:
        delete_invoices(files)
    elif choice == 3:
        download_invoices(files)
        delete_invoices(files)
    else:
        print("Invalid choice.")


if __name__ == '__main__':
    main()
