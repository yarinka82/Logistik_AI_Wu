
from celery import shared_task


@shared_task
def process_document_photo(document_id: int) -> None:
    """Preparation: processing of the photo of the document (for example, the photo of the invoice from the driver).
    Here in the future: validation, compression, uploading to S3/MinIO,
    OCR or image quality check."""
    # Todo: to be implemented after the appearance of the Document model
    pass


@shared_task
def generate_pdf_invoice(order_id: int) -> None:
    """Preparation: generation of a PDF e-invoice for the order.
    You'll need a library like weasyprint or reportlab."""
    # Todo: to be implemented after the appearance of the Order/Invoice model
    pass