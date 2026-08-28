#!/usr/bin/env python3
"""Build the completed Lab Assessment 5 submission PDF."""

from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    Image,
    KeepTogether,
    PageBreak,
    Paragraph,
    Preformatted,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
SQL_FILE = ROOT / "sql" / "assessment5_solution.sql"
OUTPUT = ROOT / "output" / "pdf" / "BCSE302P_Lab_Assessment_5_Completed.pdf"
TERMINAL_OUTPUT = ROOT / "tmp" / "pdfs" / "terminal-validation.png"
TERMINAL_CODE = ROOT / "tmp" / "pdfs" / "terminal-sql-code.png"

NAVY = colors.HexColor("#102A43")
BLUE = colors.HexColor("#1F6FEB")
TEAL = colors.HexColor("#0F766E")
INK = colors.HexColor("#243B53")
MUTED = colors.HexColor("#627D98")
PALE = colors.HexColor("#F0F4F8")
PALE_BLUE = colors.HexColor("#E8F1FB")
PALE_TEAL = colors.HexColor("#E6FFFA")
CODE_BG = colors.HexColor("#17202A")


styles = getSampleStyleSheet()
styles.add(ParagraphStyle(
    name="CoverTitle", parent=styles["Title"], fontName="Helvetica-Bold",
    fontSize=27, leading=31, textColor=NAVY, alignment=TA_CENTER, spaceAfter=12,
))
styles.add(ParagraphStyle(
    name="CoverSubtitle", parent=styles["Normal"], fontName="Helvetica",
    fontSize=13, leading=18, textColor=MUTED, alignment=TA_CENTER, spaceAfter=8,
))
styles.add(ParagraphStyle(
    name="SectionTitle", parent=styles["Heading1"], fontName="Helvetica-Bold",
    fontSize=18, leading=22, textColor=NAVY, spaceAfter=8,
))
styles.add(ParagraphStyle(
    name="QuestionTitle", parent=styles["Heading2"], fontName="Helvetica-Bold",
    fontSize=12.5, leading=16, textColor=TEAL, spaceBefore=3, spaceAfter=5,
))
styles.add(ParagraphStyle(
    name="BodySmall", parent=styles["BodyText"], fontName="Helvetica",
    fontSize=9.5, leading=13, textColor=INK, spaceAfter=6,
))
styles.add(ParagraphStyle(
    name="Note", parent=styles["BodyText"], fontName="Helvetica-Oblique",
    fontSize=8.5, leading=11, textColor=MUTED, spaceAfter=6,
))
styles.add(ParagraphStyle(
    name="CodeSmall", parent=styles["Code"], fontName="Courier", fontSize=6.15,
    leading=7.35, textColor=colors.HexColor("#E9F2FF"), leftIndent=0,
    rightIndent=0, spaceAfter=0,
))
styles.add(ParagraphStyle(
    name="CaptionSmall", parent=styles["Normal"], fontName="Helvetica-Oblique",
    fontSize=8, leading=10, textColor=MUTED, alignment=TA_CENTER, spaceBefore=4,
))
styles.add(ParagraphStyle(
    name="TableHead", parent=styles["Normal"], fontName="Helvetica-Bold",
    fontSize=8.2, leading=10, textColor=colors.white,
))
styles.add(ParagraphStyle(
    name="TableCell", parent=styles["Normal"], fontName="Helvetica",
    fontSize=8.2, leading=10, textColor=INK,
))
styles.add(ParagraphStyle(
    name="BigNumber", parent=styles["Normal"], fontName="Helvetica-Bold",
    fontSize=18, leading=20, textColor=BLUE, alignment=TA_CENTER,
))


def p(text, style="BodySmall"):
    return Paragraph(text, styles[style])


def code_block(lines, start_line):
    numbered = []
    for offset, line in enumerate(lines):
        numbered.append(f"{start_line + offset:>3}  {line}")
    text = "\n".join(numbered)
    box = Table([[Preformatted(text, styles["CodeSmall"])]], colWidths=[7.12 * inch])
    box.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), CODE_BG),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#334E68")),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    return box


def result_table(headers, rows, widths=None, highlight_rows=None):
    data = [[p(escape(str(h)), "TableHead") for h in headers]]
    for row in rows:
        data.append([p(escape(str(v)), "TableCell") for v in row])
    table = Table(data, colWidths=widths, repeatRows=1, hAlign="LEFT")
    commands = [
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#BCCCDC")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]
    for index in range(1, len(data)):
        commands.append(("BACKGROUND", (0, index), (-1, index), PALE if index % 2 else colors.white))
    for index in highlight_rows or []:
        commands.append(("BACKGROUND", (0, index + 1), (-1, index + 1), PALE_TEAL))
    table.setStyle(TableStyle(commands))
    return table


def callout(title, body, fill=PALE_BLUE):
    inner = Table([[p(f"<b>{escape(title)}</b><br/>{body}", "BodySmall")]], colWidths=[7.12 * inch])
    inner.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), fill),
        ("BOX", (0, 0), (-1, -1), 0.6, BLUE),
        ("LEFTPADDING", (0, 0), (-1, -1), 9),
        ("RIGHTPADDING", (0, 0), (-1, -1), 9),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    return inner


def footer(canvas, doc):
    canvas.saveState()
    width, height = letter
    canvas.setStrokeColor(colors.HexColor("#D9E2EC"))
    canvas.setLineWidth(0.5)
    canvas.line(42, 34, width - 42, 34)
    canvas.setFont("Helvetica", 7.5)
    canvas.setFillColor(MUTED)
    canvas.drawString(42, 22, "BCSE302P | Lab Assessment 5 | Oracle SQL + PL/SQL")
    canvas.drawRightString(width - 42, 22, f"Page {doc.page}")
    canvas.restoreState()


def build():
    sql_lines = SQL_FILE.read_text(encoding="utf-8").splitlines()
    doc = SimpleDocTemplate(
        str(OUTPUT), pagesize=letter, rightMargin=42, leftMargin=42,
        topMargin=42, bottomMargin=45, title="BCSE302P Lab Assessment 5 - Completed Solution",
        author="OpenAI Codex",
    )
    story = []

    # Cover
    story += [Spacer(1, 0.62 * inch), p("DATABASE SYSTEMS LAB", "CoverSubtitle"),
              p("Lab Assessment 5", "CoverTitle"),
              p("Complete Oracle SQL and PL/SQL solution", "CoverSubtitle"), Spacer(1, 0.28 * inch)]
    cover_info = Table([
        [p("STUDENT", "TableHead"), p("Shreshth Mishra", "TableCell")],
        [p("REGISTRATION NO.", "TableHead"), p("24BCI0081", "TableCell")],
        [p("COURSE", "TableHead"), p("Database Systems Lab &amp; BCSE302P", "TableCell")],
        [p("COURSE CODE", "TableHead"), p("BCSE302P", "TableCell")],
        [p("SEMESTER", "TableHead"), p("Fall Semester 2026-2027", "TableCell")],
        [p("ASSESSMENT", "TableHead"), p("Views (Q1-Q2) and PL/SQL Functions (Q3-Q5)", "TableCell")],
    ], colWidths=[1.45 * inch, 5.67 * inch])
    cover_info.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), NAVY), ("BACKGROUND", (1, 0), (1, -1), PALE),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#BCCCDC")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 9), ("RIGHTPADDING", (0, 0), (-1, -1), 9),
        ("TOPPADDING", (0, 0), (-1, -1), 8), ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    story += [cover_info, Spacer(1, 0.28 * inch),
              callout("Included in this submission", "Oracle DDL with named constraints, sample records, both required views, all three functions, expected result sets, and terminal evidence of the local result validation.", PALE_TEAL),
              Spacer(1, 0.18 * inch),
              p("Execution note: the source file is Oracle-native and is intended to be run in Oracle SQL*Plus or SQL Developer. The attached terminal output was generated by an executed SQLite result harness because no Oracle database listener or credentials were available in the workspace; the harness validates the same sample-data joins, calculations, filters, and orderings.", "Note"),
              PageBreak()]

    # Schema and data
    story += [p("1. Schema and sample data", "SectionTitle"),
              p("The parent tables JOBS and DEPARTMENTS are created before EMPLOYEES so the foreign keys can be declared immediately. The named primary-key, unique, not-null, check, and foreign-key constraints implement the assignment requirements.", "BodySmall"),
              code_block(sql_lines[4:75], 5), Spacer(1, 8),
              p("Sample records are deliberately chosen to produce both compliant and violating salaries, a NULL commission case, and a single highest-contributing location.", "Note"),
              PageBreak()]

    # Q1
    story += [p("2. Question 1 - Salary compliance view", "SectionTitle"),
              p("Create a view that flags each employee as COMPLIANT or VIOLATION, then show only violations ordered by the largest absolute deviation from the permitted job range.", "BodySmall"),
              code_block(sql_lines[76:102], 77), Spacer(1, 9),
              p("Expected result", "QuestionTitle"),
              result_table(["EMP_ID", "EMPLOYEE", "JOB", "SALARY", "ALLOWED RANGE", "STATUS", "DEVIATION"], [
                  (102, "Bob Smith", "DBA", "18,000.00", "7,000.00 - 15,000.00", "VIOLATION", "3,000.00"),
                  (103, "Carol Williams", "ANL", "3,500.00", "4,000.00 - 8,000.00", "VIOLATION", "500.00"),
              ], widths=[0.52*inch, 1.08*inch, 0.43*inch, 0.76*inch, 1.48*inch, 0.78*inch, 0.78*inch], highlight_rows=[0, 1]),
              Spacer(1, 8), callout("Why the ordering is correct", "Bob Smith is 3,000 above the DBA maximum; Carol Williams is 500 below the analyst minimum. Therefore Bob appears first when DEVIATION is sorted DESC.", PALE_BLUE),
              PageBreak()]

    # Q2
    story += [p("3. Question 2 - Salary bill by location", "SectionTitle"),
              p("The view aggregates employee salaries by department location. The query uses an analytic SUM to compute each location's company share and RANK to return every tied maximum if a tie exists.", "BodySmall"),
              code_block(sql_lines[102:121], 103), Spacer(1, 9),
              p("Expected result", "QuestionTitle"),
              result_table(["LOCATION", "TOTAL SALARY", "COMPANY SHARE"], [
                  ("Chennai", "18,000.00", "36.73%"),
              ], widths=[1.7*inch, 1.7*inch, 1.7*inch], highlight_rows=[0]),
              Spacer(1, 8),
              p("Company salary bill = 49,000.00. Chennai contributes 18,000.00 / 49,000.00 x 100 = 36.73%, the highest location share.", "Note"),
              PageBreak()]

    # Q3
    story += [p("4. Question 3 - Annual salary function", "SectionTitle"),
              p("GET_ANNUAL_SALARY returns salary x 12 plus the commission amount. The IF block explicitly changes a NULL commission percentage to zero before calculating the result.", "BodySmall"),
              code_block(sql_lines[121:144], 122), Spacer(1, 9),
              p("Expected checks", "QuestionTitle"),
              result_table(["EMP_ID", "EMPLOYEE", "COMMISSION", "ANNUAL SALARY"], [
                  (101, "Alice Johnson", "10.0%", "118,800.00"),
                  (102, "Bob Smith", "NULL -> 0", "216,000.00"),
                  (103, "Carol Williams", "5.0%", "44,100.00"),
                  (104, "David Brown", "15.0%", "193,200.00"),
                  (105, "Eva Davis", "20.0%", "64,800.00"),
              ], widths=[0.7*inch, 1.65*inch, 1.25*inch, 1.35*inch], highlight_rows=[1]),
              Spacer(1, 8), callout("NULL commission proof", "Bob Smith has commission_pct = NULL. The function returns 18,000 x 12 = 216,000, proving that the conditional NULL handling is applied.", PALE_TEAL),
              PageBreak()]

    # Q4/Q5
    story += [p("5. Questions 4 and 5 - Department and range functions", "SectionTitle"),
              p("GET_DEPT_NAME joins EMPLOYEES to DEPARTMENTS and returns the department name. CHECK_SALARY_RANGE joins EMPLOYEES to JOBS and returns VALID only when salary is between the inclusive minimum and maximum.", "BodySmall"),
              code_block(sql_lines[144:195], 145), Spacer(1, 8),
              p("Combined function output", "QuestionTitle"),
              result_table(["EMP_ID", "DEPARTMENT", "CHECK_SALARY_RANGE"], [
                  (101, "Engineering", "VALID"),
                  (102, "Data Services", "INVALID"),
                  (103, "Engineering", "INVALID"),
                  (104, "Program Office", "VALID"),
                  (105, "People Operations", "VALID"),
              ], widths=[0.75*inch, 2.25*inch, 1.75*inch], highlight_rows=[1, 2]),
              PageBreak()]

    # Terminal evidence output
    story += [p("6. Terminal evidence - executed validation", "SectionTitle"),
              p("This is a real terminal capture of the executed local validation harness. It shows the result sets for Q1-Q5 and the final assertion that all checks passed.", "BodySmall"),
              Image(str(TERMINAL_OUTPUT), width=7.12*inch, height=7.12*inch*(1073/1959)),
              p("Figure 1. Terminal output from python3 scripts/validate_assessment5.py", "CaptionSmall"),
              PageBreak()]

    # Terminal code + handoff
    story += [p("7. Terminal evidence - submitted Oracle source", "SectionTitle"),
              p("The second terminal capture shows the view and function definitions read directly from the submitted Oracle source file, including the conditional logic and named function blocks.", "BodySmall"),
              Image(str(TERMINAL_CODE), width=7.12*inch, height=7.12*inch*(1073/1959)),
              p("Figure 2. Terminal source excerpt read from sql/assessment5_solution.sql", "CaptionSmall"),
              Spacer(1, 10),
              callout("Run in Oracle", "Connect to your Oracle schema, then run <font name='Courier'>@sql/assessment5_solution.sql</font>. The script is re-runnable, creates the tables and sample data, creates both views and all three functions, and finishes with the required function output query.", PALE_BLUE),
              PageBreak()]

    # Final checklist
    story += [p("8. Submission checklist", "SectionTitle"),
              p("The assignment requirements are covered as follows:", "BodySmall"),
              result_table(["Requirement", "Implementation"], [
                  ("EMPLOYEES table", "PK / NOT NULL / CHECK / FK / default hire date"),
                  ("DEPARTMENTS table", "PK / unique department name / length and NOT NULL checks"),
                  ("JOBS table", "PK / salary floor / max_salary >= min_salary"),
                  ("Q1 view", "Employee salary compliance flag plus violation deviation ordering"),
                  ("Q2 view", "Salary bill by location plus highest percentage query"),
                  ("Q3 function", "Annual salary with IF-based NULL commission handling"),
                  ("Q4 function", "Department name through employee-department join"),
                  ("Q5 function", "Inclusive job salary-range validation"),
                  ("Evidence", "Two real terminal screenshots and expected outputs"),
              ], widths=[1.65*inch, 4.95*inch]),
              Spacer(1, 18),
              callout("Files", "Oracle source: <font name='Courier'>sql/assessment5_solution.sql</font><br/>Validation harness: <font name='Courier'>scripts/validate_assessment5.py</font>", PALE_TEAL),
              Spacer(1, 12),
              p("End of completed solution.", "Note")]

    doc.build(story, onFirstPage=footer, onLaterPages=footer)


if __name__ == "__main__":
    build()
