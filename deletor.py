import os
import glob
import shutil

INVOICE_DIR = './invoices'
DOWNLOAD_DIR = './downloaded_invoices'  # Location to copy invoices before deletion

def list_invoices():
    return glob.glob(os.path.join(INVOICE_DIR, '*.json'))

def get_unique_filename(dest_folder, filename):
    base, ext = os.path.splitext(filename)
    counter = 1
    new_name = filename
    while os.path.exists(os.path.join(dest_folder, new_name)):
        new_name = "{}({}){}".format(base, counter, ext)
        counter += 1
    return new_name


def download_invoices(files):
    if not os.path.exists(DOWNLOAD_DIR):
        os.makedirs(DOWNLOAD_DIR)

    for f in files:
        original_name = os.path.basename(f)
        unique_name = get_unique_filename(DOWNLOAD_DIR, original_name)
        dest = os.path.join(DOWNLOAD_DIR, unique_name)
        shutil.copy2(f, dest)
        print("Downloaded:", dest)

def delete_invoices(files):
    for f in files:
        try:
            os.remove(f)
            print("Deleted:", f)
        except Exception as e:
            print("Failed to delete {}: {}".format(f, e))

def prompt_action():
    
    choice = "1" #str(input("Enter your choice (1/2/3/4): ")).strip()

    if choice not in {'1', '2', '3', '4'}:
        print("Invalid choice. Aborting.")
        return

    files = list_invoices()
    if not files:
        print("No invoices found in '{}'.".format(INVOICE_DIR))
        return

    if choice == '1':
        download_invoices(files)
        delete_invoices(files)
        print("\nNumber of invoices found is:", len(files))

    else:
        print("Operation cancelled.")

if __name__ == '__main__':
    prompt_action()
