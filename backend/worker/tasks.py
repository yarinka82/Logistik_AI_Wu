
from celery import shared_task


@shared_task
def process_document_photo(document_id: int) -> None:
    """
    Заготовка: обработка фото документа (напр. фото накладной від водія).
    Тут у майбутньому: валідація, стиснення, завантаження в S3/MinIO,
    OCR або перевірка якості знімку.
    """
    # TODO: реалізувати після появи моделі Document
    pass


@shared_task
def generate_pdf_invoice(order_id: int) -> None:
    """
    Заготовка: генерація PDF е-накладної для замовлення.
    Знадобиться бібліотека на кшталт weasyprint або reportlab.
    """
    # TODO: реалізувати після появи моделі Order/Invoice
    pass