import io
import csv
import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from engine.fragmentation_analyzer import FragmentationAnalyzer

class ReportGenerator:
    """
    Generates professional PDF and CSV reports for storage status,
    fragmentation scans, and optimization audits.
    """

    @staticmethod
    def generate_pdf(device, files=None, scan=None, ga_run=None):
        """
        Generates a PDF bytes buffer containing comprehensive storage analytics.
        """
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )

        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'ReportTitle',
            parent=styles['Heading1'],
            fontName='Helvetica-Bold',
            fontSize=18,
            leading=22,
            textColor=colors.HexColor('#181818')
        )
        subtitle_style = ParagraphStyle(
            'ReportSubTitle',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=10,
            leading=14,
            textColor=colors.HexColor('#5B5B59')
        )
        h2_style = ParagraphStyle(
            'Heading2',
            parent=styles['Heading2'],
            fontName='Helvetica-Bold',
            fontSize=13,
            leading=16,
            textColor=colors.HexColor('#181818'),
            spaceBefore=12,
            spaceAfter=6
        )
        body_style = ParagraphStyle(
            'Body',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=9,
            leading=12,
            textColor=colors.HexColor('#181818')
        )

        elements = []

        # Title & Subtitle
        elements.append(Paragraph("Intelligent Cloud Storage Allocation & Fragmentation Report", title_style))
        elements.append(Paragraph(f"Generated on {datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')} | OS Storage Simulator Capstone", subtitle_style))
        elements.append(Spacer(1, 10))
        elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#E1E1DE'), spaceAfter=15))

        # Device Overview Table
        elements.append(Paragraph("1. Simulated Storage Device Overview", h2_style))
        device_data = [
            ["Device Name", device.name, "Total Capacity", f"{device.total_capacity_kb / 1024.0:.1f} MB ({device.total_capacity_kb} KB)"],
            ["Block Size", f"{device.block_size_kb} KB", "Total Blocks", str(device.total_blocks)],
            ["Used Blocks", str(device.blocks.filter_by(status='allocated').count()), "Free Blocks", str(device.blocks.filter_by(status='free').count())]
        ]
        t_device = Table(device_data, colWidths=[110, 155, 110, 165])
        t_device.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#FFFFFF')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#181818')),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E1E1DE')),
        ]))
        elements.append(t_device)
        elements.append(Spacer(1, 15))

        # Fragmentation Metrics
        analysis = FragmentationAnalyzer.analyze(device, files=files)
        elements.append(Paragraph("2. Fragmentation & Allocation Metrics", h2_style))
        frag_data = [
            ["Metric", "Value", "Metric", "Value"],
            ["Fragmentation Ratio", f"{analysis['fragmentation_ratio']}%", "External Fragmentation", f"{analysis['external_fragmentation_pct']}%"],
            ["Fragmented Files", f"{analysis['fragmented_files_count']} of {analysis['total_files']}", "Total File Extents", str(analysis['total_extents'])],
            ["Largest Free Contiguous Space", f"{analysis['largest_free_extent']} blocks", "Internal Fragmentation", f"{analysis['internal_fragmentation_kb']} KB"],
            ["Storage Utilization", f"{analysis['storage_utilization']}%", "Wasted Storage Estimate", f"{analysis['wasted_storage_kb']} KB"]
        ]
        t_frag = Table(frag_data, colWidths=[140, 125, 140, 135])
        t_frag.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#ECECEB')),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E1E1DE')),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ]))
        elements.append(t_frag)
        elements.append(Spacer(1, 15))

        # Files Allocation Table
        elements.append(Paragraph("3. Virtual Files & Block Extents", h2_style))
        file_list = files if files is not None else device.files
        file_table_data = [["File Name", "Size (KB)", "Blocks", "Extents", "Method", "Status"]]
        for f in file_list:
            status_text = "Fragmented" if f.is_fragmented else "Contiguous"
            file_table_data.append([
                f.name[:25],
                f"{f.file_size_bytes / 1024.0:.1f}",
                str(f.allocated_blocks_count),
                str(f.extents_count),
                f.allocation_method or "N/A",
                status_text
            ])
        if len(file_table_data) == 1:
            file_table_data.append(["No files uploaded", "-", "-", "-", "-", "-"])

        t_files = Table(file_table_data, colWidths=[150, 70, 70, 70, 100, 80])
        t_files.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#ECECEB')),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8.5),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E1E1DE')),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        elements.append(t_files)
        elements.append(Spacer(1, 15))

        # GA Optimization Summary (if present)
        if ga_run:
            elements.append(Paragraph("4. Latest Genetic Algorithm Optimization Run", h2_style))
            ga_data = [
                ["Run ID", str(ga_run.id), "Generations / Pop", f"{ga_run.generations} gen / {ga_run.population_size} pop"],
                ["Initial Fragmentation", f"{ga_run.initial_fragmentation}%", "Optimized Fragmentation", f"{ga_run.optimized_fragmentation}%"],
                ["Initial Extents", str(ga_run.initial_extents), "Optimized Extents", str(ga_run.optimized_extents)],
                ["Blocks Relocated", str(ga_run.blocks_moved), "Execution Time", f"{ga_run.execution_time_ms} ms"],
                ["Best Fitness Score", f"{ga_run.fitness_score}", "Status", ga_run.status.upper()]
            ]
            t_ga = Table(ga_data, colWidths=[140, 125, 140, 135])
            t_ga.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#ECECEB')),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E1E1DE')),
                ('TOPPADDING', (0, 0), (-1, -1), 5),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ]))
            elements.append(t_ga)

        doc.build(elements)
        buffer.seek(0)
        return buffer

    @staticmethod
    def generate_csv_files(files):
        """
        Generates CSV text for virtual files.
        """
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(['ID', 'Name', 'Type', 'Size_Bytes', 'Blocks_Count', 'Allocation_Method', 'Extents', 'Is_Fragmented', 'Created_At'])
        for f in files:
            writer.writerow([
                f.id,
                f.name,
                f.file_type,
                f.file_size_bytes,
                f.allocated_blocks_count,
                f.allocation_method,
                f.extents_count,
                f.is_fragmented,
                f.created_at.isoformat() if f.created_at else ''
            ])
        return output.getvalue()

    @staticmethod
    def generate_csv_blocks(blocks):
        """
        Generates CSV text for storage blocks.
        """
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(['Block_Index', 'Status', 'File_ID', 'Logical_Block_Index', 'Next_Block_Index'])
        for b in sorted(blocks, key=lambda x: x.block_index):
            writer.writerow([
                b.block_index,
                b.status,
                b.file_id or '',
                b.logical_block_index if b.logical_block_index is not None else '',
                b.next_block_index if b.next_block_index is not None else ''
            ])
        return output.getvalue()
