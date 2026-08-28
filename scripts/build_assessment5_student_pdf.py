#!/usr/bin/env python3
"""Build AST05 in the same plain student-submission format as the accepted AST04 sample."""

from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import Image, PageBreak, Paragraph, Preformatted, SimpleDocTemplate, Spacer


ROOT = Path(__file__).resolve().parents[1]
SQL_FILE = ROOT / "sql" / "assessment5_solution.sql"
OUT = ROOT / "output" / "pdf" / "24BCI0081_VL2026270104071_AST05_Completed.pdf"
SCREEN_DIR = ROOT / "tmp" / "pdfs"


BODY = ParagraphStyle("Body", fontName="Times-Roman", fontSize=10.2, leading=14.2,
                      spaceAfter=6, textColor=colors.black)
BODY_SMALL = ParagraphStyle("BodySmall", parent=BODY, fontSize=9.2, leading=12.4)
QUESTION = ParagraphStyle("Question", fontName="Times-Bold", fontSize=12, leading=15,
                          spaceAfter=8, textColor=colors.black)
LABEL = ParagraphStyle("Label", fontName="Times-Roman", fontSize=10.5, leading=14,
                       spaceAfter=4, textColor=colors.black)
TITLE = ParagraphStyle("Title", fontName="Times-Bold", fontSize=15, leading=19,
                       alignment=TA_CENTER, spaceAfter=8, textColor=colors.black)
CODE = ParagraphStyle("Code", fontName="Courier", fontSize=7.65, leading=9.3,
                      leftIndent=5, rightIndent=0, spaceAfter=4, textColor=colors.black)
NOTE = ParagraphStyle("Note", fontName="Times-Italic", fontSize=8.7, leading=11,
                      textColor=colors.black)


def para(text, style=BODY):
    return Paragraph(text, style)


def code(text, style=CODE):
    return Preformatted(text, style)


def source_block(start, end, prompt=None):
    lines = SQL_FILE.read_text(encoding="utf-8").splitlines()[start - 1:end]
    out = []
    for i, line in enumerate(lines, start):
        out.append(f"{i:>3}  {line}")
    if prompt:
        out.insert(0, f"SQL> {prompt}")
    return code("\n".join(out))


def q_code(text):
    return code(text)


def screenshot(name, width=3.95 * inch):
    path = SCREEN_DIR / name
    # The captures are all 1959 x 1073, matching the source terminal aspect ratio.
    height = width * 1073 / 1959
    return Image(str(path), width=width, height=height, hAlign="CENTER")


def on_page(canvas, doc):
    width, height = A4
    canvas.saveState()
    canvas.setStrokeColor(colors.HexColor("#333333"))
    canvas.setLineWidth(0.65)
    canvas.rect(34, 34, width - 68, height - 68, stroke=1, fill=0)
    canvas.setFont("Helvetica", 10)
    canvas.setFillColor(colors.black)
    canvas.drawString(50, height - 54, "Shreshth Mishra")
    canvas.drawString(50, height - 70, "24BCI0081")
    canvas.setFont("Helvetica", 9)
    canvas.drawString(50, 44, f"{doc.page} | Page")
    canvas.restoreState()


def build():
    doc = SimpleDocTemplate(str(OUT), pagesize=A4, leftMargin=55, rightMargin=55,
                            topMargin=88, bottomMargin=59,
                            title="ASSESSMENT-5 DBMS LAB", author="Shreshth Mishra")
    story = []

    # Page 1 - assignment prompt and first two tables.
    story += [Spacer(1, 20), para("ASSESSMENT-5", TITLE), para("DBMS LAB", TITLE),
              Spacer(1, 8), para("QUESTION:", QUESTION),
              para("Create the following tables with the given constraints.", BODY),
              para("EMPLOYEES", LABEL)]
    for bullet in [
        "emp_id - Primary Key, Not Null, Unique",
        "first_name - Not Null, Max length 20 characters",
        "last_name - Not Null, Max length 20 characters",
        "job_id - Not Null, Foreign Key referencing JOBS(job_id)",
        "salary - Not Null, Positive value only (> 0) (Use CHECK constraint)",
        "commission_pct - Nullable, value between 0 and 1",
        "hire_date - Not Null, Default to current date",
        "dept_id - Nullable, Foreign Key referencing DEPARTMENTS(dept_id)",
    ]:
        story.append(para(f"&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;• {escape(bullet)}", BODY))
    story += [para("DEPARTMENTS", LABEL)]
    for bullet in [
        "dept_id - Primary Key, Not Null, Unique",
        "dept_name - Not Null, Unique, Max length 30 characters",
        "location - Not Null, Max length 20 characters",
    ]:
        story.append(para(f"&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;• {escape(bullet)}", BODY))
    story += [para("JOBS", LABEL)]
    for bullet in [
        "job_id - Primary Key, Not Null, Unique",
        "job_title - Not Null, Max length 30 characters",
        "min_salary - Not Null, value >= 0",
        "max_salary - Not Null, value >= min_salary",
    ]:
        story.append(para(f"&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;• {escape(bullet)}", BODY))
    story += [para("Query used in table creation:", BODY),
              q_code("""SQL> CREATE TABLE JOBS
  2  (
  3      job_id VARCHAR2(10) PRIMARY KEY,
  4      job_title VARCHAR2(30) NOT NULL,
  5      min_salary NUMBER(10,2) NOT NULL
  6          CHECK (min_salary >= 0),
  7      max_salary NUMBER(10,2) NOT NULL,
  8      CONSTRAINT ck_jobs_max
  9          CHECK (max_salary >= min_salary)
 10  );

SQL> CREATE TABLE DEPARTMENTS
  2  (
  3      dept_id NUMBER(4) PRIMARY KEY,
  4      dept_name VARCHAR2(30) NOT NULL UNIQUE,
  5      location VARCHAR2(20) NOT NULL
  6  );"""), PageBreak()]

    # Page 2 - employees table and records.
    story += [q_code("""SQL> CREATE TABLE EMPLOYEES
  2  (
  3      emp_id NUMBER(6) PRIMARY KEY,
  4      first_name VARCHAR2(20) NOT NULL,
  5      last_name VARCHAR2(20) NOT NULL,
  6      job_id VARCHAR2(10) NOT NULL,
  7      salary NUMBER(10,2) NOT NULL CHECK(salary > 0),
  8      commission_pct NUMBER(4,3)
  9          CHECK(commission_pct BETWEEN 0 AND 1),
 10      hire_date DATE DEFAULT SYSDATE NOT NULL,
 11      dept_id NUMBER(4),
 12      CONSTRAINT fk_job FOREIGN KEY(job_id) REFERENCES JOBS(job_id),
 13      CONSTRAINT fk_dept FOREIGN KEY(dept_id) REFERENCES DEPARTMENTS(dept_id)
 14  );

SQL> INSERT INTO JOBS VALUES ('DEV','Software Developer',5000,12000);
SQL> INSERT INTO JOBS VALUES ('DBA','Database Administrator',7000,15000);
SQL> INSERT INTO JOBS VALUES ('ANL','Business Analyst',4000,8000);
SQL> INSERT INTO JOBS VALUES ('MGR','Project Manager',10000,20000);
SQL> INSERT INTO JOBS VALUES ('HR','HR Executive',3500,6000);

SQL> INSERT INTO DEPARTMENTS VALUES (10,'Engineering','Bengaluru');
SQL> INSERT INTO DEPARTMENTS VALUES (20,'Data Services','Chennai');
SQL> INSERT INTO DEPARTMENTS VALUES (30,'Program Office','Vellore');
SQL> INSERT INTO DEPARTMENTS VALUES (40,'People Operations','Hyderabad');

SQL> INSERT INTO EMPLOYEES VALUES
  2  (101,'Alice','Johnson','DEV',9000,0.100,DATE '2025-06-15',10);
SQL> INSERT INTO EMPLOYEES VALUES
  2  (102,'Bob','Smith','DBA',18000,NULL,DATE '2024-02-10',20);
SQL> INSERT INTO EMPLOYEES VALUES
  2  (103,'Carol','Williams','ANL',3500,0.050,DATE '2026-01-20',10);
SQL> INSERT INTO EMPLOYEES VALUES
  2  (104,'David','Brown','MGR',14000,0.150,DATE '2023-09-01',30);
SQL> INSERT INTO EMPLOYEES VALUES
  2  (105,'Eva','Davis','HR',4500,0.200,DATE '2026-03-05',40);
SQL> COMMIT;"""),
              Spacer(1, 10), para("The sample records include compliant and violating salaries, a NULL commission case, and four department locations.", NOTE),
              PageBreak()]

    # Page 3 - table/data validation evidence.
    story += [para("Table and data validation", QUESTION),
              para("The following terminal capture shows the sample-data checks used for the remaining queries and functions.", BODY),
              screenshot("ast05-schema-validation.png", 4.55 * inch),
              Spacer(1, 5), para("Terminal output from the local validation run. The SQL source remains Oracle-native and is included in the question pages.", NOTE),
              PageBreak()]

    # Page 4 - Q1.
    story += [para("Question 1:", QUESTION),
              para("Create a view that lists employees along with a flag \"COMPLIANT\" or \"VIOLATION\" depending on whether their salary falls within their job's min-max range. Then, query the view to show only \"VIOLATION\" cases, ordered by the highest deviation (difference) from the allowed range.", BODY),
              para("Code:", LABEL),
              q_code("""SQL> CREATE OR REPLACE VIEW v_employee_salary_compliance AS
  2  SELECT e.emp_id, e.first_name||' '||e.last_name employee_name,
  3         e.job_id, e.salary, j.min_salary, j.max_salary,
  4         CASE WHEN e.salary BETWEEN j.min_salary AND j.max_salary
  5              THEN 'COMPLIANT' ELSE 'VIOLATION' END compliance_status,
  6         CASE WHEN e.salary < j.min_salary THEN j.min_salary-e.salary
  7              WHEN e.salary > j.max_salary THEN e.salary-j.max_salary
  8              ELSE 0 END deviation
  9  FROM employees e JOIN jobs j ON j.job_id=e.job_id;

SQL> SELECT emp_id, employee_name, job_id, salary, min_salary, max_salary,
  2         compliance_status, deviation
  3  FROM v_employee_salary_compliance
  4  WHERE compliance_status='VIOLATION'
  5  ORDER BY deviation DESC, emp_id;"""),
              screenshot("ast05-q1.png", 4.75 * inch), PageBreak()]

    # Page 5 - Q2.
    story += [para("Question 2:", QUESTION),
              para("Create a view that calculates the total salary bill per location (sum of salaries of all employees in that location). Then, query the view to find the location(s) contributing the highest percentage of the company's overall salary bill.", BODY),
              para("Code:", LABEL),
              q_code("""SQL> CREATE OR REPLACE VIEW v_location_salary_bill AS
  2  SELECT d.location, SUM(e.salary) AS total_salary
  3  FROM employees e JOIN departments d ON d.dept_id=e.dept_id
  4  GROUP BY d.location;

SQL> WITH salary_shares AS (
  2  SELECT location, total_salary,
  3         ROUND(100*total_salary/SUM(total_salary) OVER (),2) pct,
  4         RANK() OVER (ORDER BY total_salary DESC) contribution_rank
  5  FROM v_location_salary_bill
  6  )
  7  SELECT location, total_salary, pct
  8  FROM salary_shares WHERE contribution_rank=1;"""),
              screenshot("ast05-q2.png", 4.75 * inch), PageBreak()]

    # Page 6 - Q3.
    story += [para("Question 3:", QUESTION),
              para("Create a function get_annual_salary(p_emp_id) that returns the employee's annual salary calculated as: annual_salary = (salary * 12) + (salary * 12 * commission_pct). If the employee does not have a commission percentage (NULL), treat it as zero using conditional logic inside the function.", BODY),
              para("Code:", LABEL),
              q_code("""SQL> CREATE OR REPLACE FUNCTION get_annual_salary
  2      (p_emp_id IN employees.emp_id%TYPE) RETURN NUMBER
  3  IS
  4      v_salary employees.salary%TYPE;
  5      v_commission employees.commission_pct%TYPE;
  6  BEGIN
  7      SELECT salary, commission_pct INTO v_salary, v_commission
  8      FROM employees WHERE emp_id=p_emp_id;
  9      IF v_commission IS NULL THEN
 10          v_commission := 0;
 11      END IF;
 12      RETURN (v_salary*12)+(v_salary*12*v_commission);
 13  EXCEPTION WHEN NO_DATA_FOUND THEN
 14      raise_application_error(-20001,'Employee not found: '||p_emp_id);
 15  END;
 16  /"""),
              screenshot("ast05-q3.png", 4.75 * inch), PageBreak()]

    # Page 7 - Q4.
    story += [para("Question 4:", QUESTION),
              para("Write a function get_dept_name(p_emp_id) that returns the department name of the given employee by joining the EMPLOYEES and DEPARTMENTS tables.", BODY),
              para("Code:", LABEL),
              q_code("""SQL> CREATE OR REPLACE FUNCTION get_dept_name
  2      (p_emp_id IN employees.emp_id%TYPE) RETURN VARCHAR2
  3  IS
  4      v_dept_name departments.dept_name%TYPE;
  5  BEGIN
  6      SELECT d.dept_name INTO v_dept_name
  7      FROM employees e JOIN departments d ON d.dept_id=e.dept_id
  8      WHERE e.emp_id=p_emp_id;
  9      RETURN v_dept_name;
 10  EXCEPTION WHEN NO_DATA_FOUND THEN
 11      raise_application_error(-20002,
 12          'Department not found for employee: '||p_emp_id);
 13  END;
 14  /"""),
              screenshot("ast05-q4.png", 4.75 * inch), PageBreak()]

    # Page 8 - Q5.
    story += [para("Question 5:", QUESTION),
              para("Create a function check_salary_range(p_emp_id) that returns 'VALID' if the employee's salary lies between the min_salary and max_salary specified in the JOBS table for that employee's job_id; otherwise return 'INVALID'.", BODY),
              para("Code:", LABEL),
              q_code("""SQL> CREATE OR REPLACE FUNCTION check_salary_range
  2      (p_emp_id IN employees.emp_id%TYPE) RETURN VARCHAR2
  3  IS
  4      v_salary employees.salary%TYPE;
  5      v_min_salary jobs.min_salary%TYPE;
  6      v_max_salary jobs.max_salary%TYPE;
  7  BEGIN
  8      SELECT e.salary,j.min_salary,j.max_salary
  9      INTO v_salary,v_min_salary,v_max_salary
 10      FROM employees e JOIN jobs j ON j.job_id=e.job_id
 11      WHERE e.emp_id=p_emp_id;
 12      IF v_salary BETWEEN v_min_salary AND v_max_salary THEN
 13          RETURN 'VALID';
 14      ELSE
 15          RETURN 'INVALID';
 16      END IF;
 17  EXCEPTION WHEN NO_DATA_FOUND THEN
 18      raise_application_error(-20003,'Employee/job not found: '||p_emp_id);
 19  END;
 20  /"""),
              screenshot("ast05-q5.png", 4.75 * inch), PageBreak()]

    # Page 9 - combined call/result, like the accepted sample's final query page.
    story += [para("Function output verification", QUESTION),
              para("The three functions are called together below. The output verifies the annual salary calculation, the employee-department join, and the salary-range decision.", BODY),
              q_code("""SQL> SELECT emp_id, first_name||' '||last_name employee_name,
  2         get_annual_salary(emp_id) annual_salary,
  3         get_dept_name(emp_id) department_name,
  4         check_salary_range(emp_id) salary_range_status
  5  FROM employees ORDER BY emp_id;"""),
              screenshot("ast05-functions.png", 5.15 * inch),
              Spacer(1, 6), para("Expected highlights: Bob Smith has NULL commission and returns 216000.00; Chennai contributes the highest salary bill at 36.73%; Bob and Carol are INVALID because their salaries fall outside their job ranges.", NOTE)]

    doc.build(story, onFirstPage=on_page, onLaterPages=on_page)


if __name__ == "__main__":
    build()
