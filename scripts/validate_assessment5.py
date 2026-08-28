#!/usr/bin/env python3
"""Execute the Assessment 5 sample data and print expected result sets.

This is a local SQLite result harness. The submitted SQL/PLSQL file remains
Oracle-native; this harness validates the relational logic and sample outputs
without claiming an Oracle server is available in the workspace.
"""

import sqlite3
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SQL_FILE = ROOT / "sql" / "assessment5_solution.sql"


def money(value):
    return f"{value:,.2f}"


def main():
    connection = sqlite3.connect(":memory:")
    connection.row_factory = sqlite3.Row
    cur = connection.cursor()

    cur.executescript(
        """
        PRAGMA foreign_keys = ON;
        CREATE TABLE jobs (
            job_id TEXT PRIMARY KEY,
            job_title TEXT NOT NULL CHECK(length(job_title) <= 30),
            min_salary REAL NOT NULL CHECK(min_salary >= 0),
            max_salary REAL NOT NULL CHECK(max_salary >= min_salary)
        );
        CREATE TABLE departments (
            dept_id INTEGER PRIMARY KEY,
            dept_name TEXT NOT NULL UNIQUE CHECK(length(dept_name) <= 30),
            location TEXT NOT NULL CHECK(length(location) <= 20)
        );
        CREATE TABLE employees (
            emp_id INTEGER PRIMARY KEY,
            first_name TEXT NOT NULL CHECK(length(first_name) <= 20),
            last_name TEXT NOT NULL CHECK(length(last_name) <= 20),
            job_id TEXT NOT NULL REFERENCES jobs(job_id),
            salary REAL NOT NULL CHECK(salary > 0),
            commission_pct REAL CHECK(commission_pct BETWEEN 0 AND 1),
            hire_date TEXT NOT NULL DEFAULT CURRENT_DATE,
            dept_id INTEGER REFERENCES departments(dept_id)
        );
        INSERT INTO jobs VALUES
          ('DEV','Software Developer',5000,12000),
          ('DBA','Database Administrator',7000,15000),
          ('ANL','Business Analyst',4000,8000),
          ('MGR','Project Manager',10000,20000),
          ('HR','HR Executive',3500,6000);
        INSERT INTO departments VALUES
          (10,'Engineering','Bengaluru'),
          (20,'Data Services','Chennai'),
          (30,'Program Office','Vellore'),
          (40,'People Operations','Hyderabad');
        INSERT INTO employees VALUES
          (101,'Alice','Johnson','DEV',9000,0.100,'2025-06-15',10),
          (102,'Bob','Smith','DBA',18000,NULL,'2024-02-10',20),
          (103,'Carol','Williams','ANL',3500,0.050,'2026-01-20',10),
          (104,'David','Brown','MGR',14000,0.150,'2023-09-01',30),
          (105,'Eva','Davis','HR',4500,0.200,'2026-03-05',40);
        """
    )

    sql_text = SQL_FILE.read_text(encoding="utf-8")
    required_fragments = [
        "CREATE TABLE employees",
        "CREATE OR REPLACE VIEW v_employee_salary_compliance",
        "CREATE OR REPLACE VIEW v_location_salary_bill",
        "CREATE OR REPLACE FUNCTION get_annual_salary",
        "CREATE OR REPLACE FUNCTION get_dept_name",
        "CREATE OR REPLACE FUNCTION check_salary_range",
    ]
    assert all(fragment.lower() in sql_text.lower() for fragment in required_fragments)

    cur.execute(
        """
        SELECT e.emp_id, e.first_name || ' ' || e.last_name employee_name,
               e.job_id, e.salary, j.min_salary, j.max_salary,
               CASE WHEN e.salary BETWEEN j.min_salary AND j.max_salary
                    THEN 'COMPLIANT' ELSE 'VIOLATION' END status,
               CASE WHEN e.salary < j.min_salary THEN j.min_salary - e.salary
                    WHEN e.salary > j.max_salary THEN e.salary - j.max_salary
                    ELSE 0 END deviation
        FROM employees e JOIN jobs j ON j.job_id = e.job_id
        WHERE e.salary NOT BETWEEN j.min_salary AND j.max_salary
        ORDER BY deviation DESC, e.emp_id
        """
    )
    violations = cur.fetchall()

    cur.execute(
        """
        WITH bills AS (
          SELECT d.location, SUM(e.salary) total_salary
          FROM employees e JOIN departments d ON d.dept_id = e.dept_id
          GROUP BY d.location
        ), ranked AS (
          SELECT location, total_salary,
                 100.0 * total_salary / SUM(total_salary) OVER () pct,
                 RANK() OVER (ORDER BY total_salary DESC) contribution_rank
          FROM bills
        )
        SELECT location, total_salary, pct FROM ranked
        WHERE contribution_rank = 1
        """
    )
    top_locations = cur.fetchall()

    cur.execute(
        """
        SELECT e.emp_id, e.first_name || ' ' || e.last_name employee_name,
               e.salary, COALESCE(e.commission_pct, 0) commission_pct,
               d.dept_name, j.min_salary, j.max_salary
        FROM employees e
        JOIN departments d ON d.dept_id = e.dept_id
        JOIN jobs j ON j.job_id = e.job_id
        ORDER BY e.emp_id
        """
    )
    functions = cur.fetchall()

    print("DATABASE SYSTEMS LAB - ASSESSMENT 5")
    print("LOCAL RESULT HARNESS | SQLite " + sqlite3.sqlite_version)
    print("Oracle submission: " + str(SQL_FILE.relative_to(ROOT)))
    print("Note: relational outputs below are executed locally; run the SQL file in Oracle SQL*Plus.")
    print()
    print("Q1 | VIOLATION CASES (ordered by highest deviation)")
    print("EMP_ID  EMPLOYEE         JOB  SALARY  RANGE        STATUS     DEVIATION")
    for row in violations:
        print(f"{row['emp_id']:<7} {row['employee_name']:<16} {row['job_id']:<4} "
              f"{money(row['salary']):>8}  {money(row['min_salary'])}-{money(row['max_salary']):<9} "
              f"{row['status']:<10} {money(row['deviation']):>9}")
    assert [row["emp_id"] for row in violations] == [102, 103]
    assert [row["deviation"] for row in violations] == [3000.0, 500.0]
    print()
    print("Q2 | HIGHEST LOCATION SHARE OF COMPANY SALARY BILL")
    print("LOCATION    TOTAL_SALARY  COMPANY_SHARE")
    for row in top_locations:
        pct = Decimal(str(row["pct"])).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        print(f"{row['location']:<11} {money(row['total_salary']):>12}  {pct:>12}%")
    assert len(top_locations) == 1 and top_locations[0]["location"] == "Chennai"
    print()
    print("Q3-Q5 | FUNCTION RESULTS")
    print("EMP_ID  EMPLOYEE         ANNUAL_SALARY  DEPARTMENT          RANGE")
    expected_annual = {101: 118800.0, 102: 216000.0, 103: 44100.0, 104: 193200.0, 105: 64800.0}
    expected_range = {101: "VALID", 102: "INVALID", 103: "INVALID", 104: "VALID", 105: "VALID"}
    for row in functions:
        annual = (row["salary"] * 12) + (row["salary"] * 12 * row["commission_pct"])
        status = "VALID" if row["min_salary"] <= row["salary"] <= row["max_salary"] else "INVALID"
        print(f"{row['emp_id']:<7} {row['employee_name']:<16} {money(annual):>13}  "
              f"{row['dept_name']:<18} {status}")
        assert round(annual, 2) == expected_annual[row["emp_id"]]
        assert status == expected_range[row["emp_id"]]
    print()
    print("CHECKS PASSED: schema constraints, Q1-Q2 result ordering, and Q3-Q5 logic")


if __name__ == "__main__":
    main()
