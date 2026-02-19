"""
PDF Receipt Generation Service for TEMARUCO
Generates professional payment receipts for quotes marked as paid.
"""

import io
import os
import logging
from datetime import datetime, timezone
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT

logger = logging.getLogger(__name__)

# TEMARUCO Brand Colors
TEMARUCO_RED = colors.HexColor('#D90429')
TEMARUCO_BLACK = colors.HexColor('#2B2D42')
TEMARUCO_GREY = colors.HexColor('#8D99AE')


def generate_receipt_pdf(quote_data: dict, order_id: str = None) -> bytes:
    """
    Generate a professional PDF receipt for a paid quote.
    
    Args:
        quote_data: Dictionary containing quote information
        order_id: Optional order ID if created from quote
    
    Returns:
        bytes: PDF file content
    """
    buffer = io.BytesIO()
    
    # Create document
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=1*cm,
        leftMargin=1*cm,
        topMargin=1*cm,
        bottomMargin=1*cm
    )
    
    # Get styles
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=TEMARUCO_RED,
        alignment=TA_CENTER,
        spaceAfter=20
    )
    
    header_style = ParagraphStyle(
        'CustomHeader',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=TEMARUCO_BLACK,
        spaceBefore=15,
        spaceAfter=10
    )
    
    normal_style = ParagraphStyle(
        'CustomNormal',
        parent=styles['Normal'],
        fontSize=10,
        textColor=TEMARUCO_BLACK
    )
    
    center_style = ParagraphStyle(
        'CenterText',
        parent=styles['Normal'],
        fontSize=10,
        alignment=TA_CENTER,
        textColor=TEMARUCO_GREY
    )
    
    right_style = ParagraphStyle(
        'RightText',
        parent=styles['Normal'],
        fontSize=10,
        alignment=TA_RIGHT,
        textColor=TEMARUCO_BLACK
    )
    
    # Build content
    content = []
    
    # Header with Logo placeholder and company info
    header_data = [
        [
            Paragraph('<b>TEMARUCO</b>', ParagraphStyle('Logo', fontSize=28, textColor=TEMARUCO_RED, alignment=TA_LEFT)),
            Paragraph('<b>PAYMENT RECEIPT</b>', ParagraphStyle('ReceiptTitle', fontSize=20, textColor=TEMARUCO_BLACK, alignment=TA_RIGHT))
        ],
        [
            Paragraph('Premium Fashion, Souvenirs & Creative Solutions', ParagraphStyle('Tagline', fontSize=9, textColor=TEMARUCO_GREY, alignment=TA_LEFT)),
            Paragraph(f"Receipt #: {quote_data.get('quote_number', 'N/A')}", ParagraphStyle('ReceiptNum', fontSize=10, alignment=TA_RIGHT))
        ]
    ]
    
    header_table = Table(header_data, colWidths=[10*cm, 8*cm])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
    ]))
    content.append(header_table)
    content.append(Spacer(1, 0.5*cm))
    
    # Horizontal line
    line_data = [['']]
    line_table = Table(line_data, colWidths=[18*cm])
    line_table.setStyle(TableStyle([
        ('LINEABOVE', (0, 0), (-1, 0), 2, TEMARUCO_RED),
    ]))
    content.append(line_table)
    content.append(Spacer(1, 0.5*cm))
    
    # Client and Payment Info
    payment_date = quote_data.get('marked_paid_at', datetime.now(timezone.utc).isoformat())
    if isinstance(payment_date, str):
        try:
            payment_date = datetime.fromisoformat(payment_date.replace('Z', '+00:00'))
        except:
            payment_date = datetime.now(timezone.utc)
    
    info_data = [
        [
            Paragraph('<b>Bill To:</b>', normal_style),
            Paragraph('<b>Payment Details:</b>', normal_style)
        ],
        [
            Paragraph(f"{quote_data.get('client_name', 'N/A')}", normal_style),
            Paragraph(f"Date: {payment_date.strftime('%B %d, %Y')}", normal_style)
        ],
        [
            Paragraph(f"{quote_data.get('client_email', 'N/A')}", normal_style),
            Paragraph(f"Quote ID: {quote_data.get('id', 'N/A')}", normal_style)
        ],
        [
            Paragraph(f"{quote_data.get('client_phone', '')}", normal_style),
            Paragraph(f"Order ID: {order_id or quote_data.get('order_id', 'N/A')}", normal_style) if order_id or quote_data.get('order_id') else Paragraph('', normal_style)
        ],
    ]
    
    info_table = Table(info_data, colWidths=[9*cm, 9*cm])
    info_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))
    content.append(info_table)
    content.append(Spacer(1, 0.8*cm))
    
    # Items Table Header
    content.append(Paragraph('<b>Order Items</b>', header_style))
    
    # Build items table
    items = quote_data.get('items', [])
    table_data = [['Item', 'Qty', 'Size', 'Color', 'Gender', 'Unit Price', 'Total']]
    
    for item in items:
        description = item.get('description', item.get('name', 'Item'))
        quantity = item.get('quantity', 1)
        size = item.get('size', '-')
        color = item.get('color', '-')
        gender = item.get('gender', '-')
        unit_price = item.get('unit_price', 0)
        total = item.get('total', unit_price * quantity)
        
        table_data.append([
            Paragraph(description[:40] + ('...' if len(description) > 40 else ''), normal_style),
            str(quantity),
            str(size) if size else '-',
            str(color) if color else '-',
            str(gender) if gender else '-',
            f"₦{unit_price:,.2f}",
            f"₦{total:,.2f}"
        ])
    
    # Create items table
    items_table = Table(table_data, colWidths=[5*cm, 1.5*cm, 2*cm, 2*cm, 2*cm, 2.5*cm, 3*cm])
    items_table.setStyle(TableStyle([
        # Header style
        ('BACKGROUND', (0, 0), (-1, 0), TEMARUCO_BLACK),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('TOPPADDING', (0, 0), (-1, 0), 8),
        
        # Data rows
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('ALIGN', (1, 1), (1, -1), 'CENTER'),  # Qty
        ('ALIGN', (2, 1), (4, -1), 'CENTER'),  # Size, Color, Gender
        ('ALIGN', (5, 1), (-1, -1), 'RIGHT'),  # Prices
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 1), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
        
        # Grid
        ('GRID', (0, 0), (-1, -1), 0.5, TEMARUCO_GREY),
        ('LINEBELOW', (0, 0), (-1, 0), 2, TEMARUCO_RED),
        
        # Alternating row colors
        *[('BACKGROUND', (0, i), (-1, i), colors.HexColor('#F8F9FA')) for i in range(2, len(table_data), 2)]
    ]))
    content.append(items_table)
    content.append(Spacer(1, 0.5*cm))
    
    # Totals section
    subtotal = quote_data.get('subtotal', 0)
    tax = quote_data.get('tax', 0)
    discount = quote_data.get('discount', 0)
    total = quote_data.get('total', 0)
    
    totals_data = []
    if subtotal:
        totals_data.append(['', '', '', '', '', 'Subtotal:', f"₦{subtotal:,.2f}"])
    if tax:
        totals_data.append(['', '', '', '', '', 'Tax/VAT:', f"₦{tax:,.2f}"])
    if discount:
        totals_data.append(['', '', '', '', '', 'Discount:', f"-₦{discount:,.2f}"])
    totals_data.append(['', '', '', '', '', 'TOTAL PAID:', f"₦{total:,.2f}"])
    
    totals_table = Table(totals_data, colWidths=[5*cm, 1.5*cm, 2*cm, 2*cm, 2*cm, 2.5*cm, 3*cm])
    totals_table.setStyle(TableStyle([
        ('FONTNAME', (5, -1), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (5, -1), (-1, -1), 11),
        ('TEXTCOLOR', (5, -1), (-1, -1), TEMARUCO_RED),
        ('ALIGN', (5, 0), (-1, -1), 'RIGHT'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LINEABOVE', (5, -1), (-1, -1), 2, TEMARUCO_BLACK),
    ]))
    content.append(totals_table)
    content.append(Spacer(1, 1*cm))
    
    # Payment Status Badge
    status_style = ParagraphStyle(
        'PaymentStatus',
        fontSize=14,
        textColor=colors.white,
        alignment=TA_CENTER,
        backColor=colors.HexColor('#28A745'),
        borderPadding=10
    )
    
    status_data = [['PAYMENT RECEIVED - THANK YOU!']]
    status_table = Table(status_data, colWidths=[10*cm])
    status_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#28A745')),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 12),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('LEFTPADDING', (0, 0), (-1, -1), 20),
        ('RIGHTPADDING', (0, 0), (-1, -1), 20),
    ]))
    
    # Center the status table
    centered_status = Table([[status_table]], colWidths=[18*cm])
    centered_status.setStyle(TableStyle([('ALIGN', (0, 0), (-1, -1), 'CENTER')]))
    content.append(centered_status)
    content.append(Spacer(1, 1*cm))
    
    # Footer
    footer_text = """
    <b>Thank you for choosing TEMARUCO!</b><br/>
    <br/>
    For inquiries, please contact us at: temarucoltd@gmail.com<br/>
    Website: www.temarucogroup.com
    """
    content.append(Paragraph(footer_text, center_style))
    content.append(Spacer(1, 0.5*cm))
    
    # Terms
    terms_style = ParagraphStyle(
        'Terms',
        fontSize=8,
        textColor=TEMARUCO_GREY,
        alignment=TA_CENTER
    )
    terms_text = """
    This receipt confirms payment has been received. Production will commence upon design approval if applicable.
    For branded items requiring TEMARUCO design services, additional fees may apply as discussed.
    """
    content.append(Paragraph(terms_text, terms_style))
    
    # Build PDF
    doc.build(content)
    
    # Get PDF bytes
    pdf_bytes = buffer.getvalue()
    buffer.close()
    
    return pdf_bytes


async def upload_receipt_to_supabase(pdf_bytes: bytes, quote_id: str) -> str:
    """
    Upload receipt PDF to Supabase storage.
    
    Args:
        pdf_bytes: PDF file content as bytes
        quote_id: Quote ID for filename
    
    Returns:
        str: Public URL of uploaded receipt
    """
    from services.storage_service import get_supabase_client, get_supabase_config
    
    client = get_supabase_client()
    
    if client is None:
        # Fallback to local storage
        local_dir = Path('/app/backend/uploads/receipts')
        local_dir.mkdir(exist_ok=True, parents=True)
        
        filename = f"receipt-{quote_id}.pdf"
        filepath = local_dir / filename
        
        with open(filepath, 'wb') as f:
            f.write(pdf_bytes)
        
        return f"/uploads/receipts/{filename}"
    
    try:
        config = get_supabase_config()
        bucket = config['bucket']
        
        filename = f"receipts/receipt-{quote_id}.pdf"
        
        # Upload to Supabase
        response = client.storage.from_(bucket).upload(
            filename,
            pdf_bytes,
            file_options={"content-type": "application/pdf", "upsert": "true"}
        )
        
        # Get public URL
        public_url = client.storage.from_(bucket).get_public_url(filename)
        
        logger.info(f"Receipt uploaded to Supabase: {filename}")
        return public_url
        
    except Exception as e:
        logger.error(f"Failed to upload receipt to Supabase: {e}")
        
        # Fallback to local storage
        from pathlib import Path
        local_dir = Path('/app/backend/uploads/receipts')
        local_dir.mkdir(exist_ok=True, parents=True)
        
        filename = f"receipt-{quote_id}.pdf"
        filepath = local_dir / filename
        
        with open(filepath, 'wb') as f:
            f.write(pdf_bytes)
        
        return f"/uploads/receipts/{filename}"
