"""Database connection manager. Supports SQLite (demo), Postgres, MySQL."""
import os
import sqlite3
from pathlib import Path
from typing import List, Dict, Any
from sqlalchemy import create_engine, text, inspect

DEMO_DB_DIR = Path(__file__).parent / "demo_dbs"
DEMO_DB_DIR.mkdir(exist_ok=True)

CHINOOK_PATH = DEMO_DB_DIR / "chinook.db"
HR_PATH = DEMO_DB_DIR / "hr.db"


def _seed_chinook():
    if CHINOOK_PATH.exists():
        return
    conn = sqlite3.connect(CHINOOK_PATH)
    cur = conn.cursor()
    cur.executescript("""
        CREATE TABLE artists (artist_id INTEGER PRIMARY KEY, name TEXT);
        CREATE TABLE albums (album_id INTEGER PRIMARY KEY, title TEXT, artist_id INTEGER, year INTEGER, FOREIGN KEY (artist_id) REFERENCES artists(artist_id));
        CREATE TABLE genres (genre_id INTEGER PRIMARY KEY, name TEXT);
        CREATE TABLE tracks (track_id INTEGER PRIMARY KEY, name TEXT, album_id INTEGER, genre_id INTEGER, milliseconds INTEGER, unit_price REAL, FOREIGN KEY (album_id) REFERENCES albums(album_id), FOREIGN KEY (genre_id) REFERENCES genres(genre_id));
        CREATE TABLE customers (customer_id INTEGER PRIMARY KEY, first_name TEXT, last_name TEXT, country TEXT, email TEXT);
        CREATE TABLE invoices (invoice_id INTEGER PRIMARY KEY, customer_id INTEGER, invoice_date TEXT, total REAL, FOREIGN KEY (customer_id) REFERENCES customers(customer_id));
        CREATE TABLE invoice_items (invoice_item_id INTEGER PRIMARY KEY, invoice_id INTEGER, track_id INTEGER, quantity INTEGER, unit_price REAL, FOREIGN KEY (invoice_id) REFERENCES invoices(invoice_id), FOREIGN KEY (track_id) REFERENCES tracks(track_id));
    """)
    artists = [(1,'AC/DC'),(2,'Queen'),(3,'Pink Floyd'),(4,'The Beatles'),(5,'Daft Punk'),(6,'Radiohead'),(7,'Kendrick Lamar'),(8,'Taylor Swift')]
    cur.executemany("INSERT INTO artists VALUES (?,?)", artists)
    albums = [(1,'Back in Black',1,1980),(2,'Highway to Hell',1,1979),(3,'A Night at the Opera',2,1975),
              (4,'The Dark Side of the Moon',3,1973),(5,'Abbey Road',4,1969),(6,'Random Access Memories',5,2013),
              (7,'OK Computer',6,1997),(8,'DAMN.',7,2017),(9,'1989',8,2014),(10,'Folklore',8,2020)]
    cur.executemany("INSERT INTO albums VALUES (?,?,?,?)", albums)
    genres = [(1,'Rock'),(2,'Electronic'),(3,'Hip-Hop'),(4,'Pop'),(5,'Alternative')]
    cur.executemany("INSERT INTO genres VALUES (?,?)", genres)
    tracks = [
        (1,'Hells Bells',1,1,312000,0.99),(2,'Back in Black',1,1,255000,0.99),
        (3,'Highway to Hell',2,1,208000,0.99),(4,'Bohemian Rhapsody',3,1,355000,1.29),
        (5,'Love of My Life',3,1,219000,0.99),(6,'Time',4,1,408000,0.99),
        (7,'Money',4,1,382000,0.99),(8,'Come Together',5,1,259000,0.99),
        (9,'Get Lucky',6,2,369000,1.29),(10,'Instant Crush',6,2,338000,1.29),
        (11,'Paranoid Android',7,5,386000,0.99),(12,'Karma Police',7,5,261000,0.99),
        (13,'HUMBLE.',8,3,177000,1.29),(14,'DNA.',8,3,185000,1.29),
        (15,'Shake It Off',9,4,219000,1.29),(16,'Blank Space',9,4,231000,1.29),
        (17,'cardigan',10,4,239000,1.29),(18,'exile',10,4,285000,1.29)
    ]
    cur.executemany("INSERT INTO tracks VALUES (?,?,?,?,?,?)", tracks)
    customers = [(1,'John','Smith','USA','john@example.com'),(2,'Maria','Garcia','Spain','maria@example.com'),
                 (3,'Yuki','Tanaka','Japan','yuki@example.com'),(4,'Liam','OBrien','Ireland','liam@example.com'),
                 (5,'Aisha','Khan','India','aisha@example.com'),(6,'Sven','Larsson','Sweden','sven@example.com'),
                 (7,'Ana','Silva','Brazil','ana@example.com'),(8,'David','Brown','USA','david@example.com')]
    cur.executemany("INSERT INTO customers VALUES (?,?,?,?,?)", customers)
    invoices = [(1,1,'2024-01-15',12.97),(2,2,'2024-01-22',5.94),(3,3,'2024-02-03',23.76),
                (4,4,'2024-02-14',8.94),(5,5,'2024-03-01',17.85),(6,1,'2024-03-12',9.99),
                (7,6,'2024-04-04',15.84),(8,7,'2024-04-20',11.88),(9,8,'2024-05-09',21.78),
                (10,2,'2024-06-11',7.92)]
    cur.executemany("INSERT INTO invoices VALUES (?,?,?,?)", invoices)
    items = [(1,1,2,2,0.99),(2,1,4,1,1.29),(3,1,9,1,1.29),(4,2,5,3,0.99),(5,3,6,2,0.99),
             (6,3,7,3,0.99),(7,3,11,4,0.99),(8,4,8,3,0.99),(9,5,4,5,1.29),(10,5,13,2,1.29),
             (11,6,12,3,0.99),(12,7,15,4,1.29),(13,8,16,3,1.29),(14,9,17,5,1.29),(15,10,18,2,1.29)]
    cur.executemany("INSERT INTO invoice_items VALUES (?,?,?,?,?)", items)
    conn.commit()
    conn.close()


def _seed_hr():
    if HR_PATH.exists():
        return
    conn = sqlite3.connect(HR_PATH)
    cur = conn.cursor()
    cur.executescript("""
        CREATE TABLE departments (dept_id INTEGER PRIMARY KEY, name TEXT, budget REAL);
        CREATE TABLE employees (emp_id INTEGER PRIMARY KEY, first_name TEXT, last_name TEXT, dept_id INTEGER, salary REAL, hire_date TEXT, manager_id INTEGER, FOREIGN KEY (dept_id) REFERENCES departments(dept_id));
        CREATE TABLE projects (project_id INTEGER PRIMARY KEY, name TEXT, dept_id INTEGER, status TEXT, start_date TEXT);
        CREATE TABLE project_assignments (assignment_id INTEGER PRIMARY KEY, project_id INTEGER, emp_id INTEGER, hours_per_week INTEGER);
    """)
    cur.executemany("INSERT INTO departments VALUES (?,?,?)", [
        (1,'Engineering',2500000),(2,'Sales',1200000),(3,'Marketing',800000),
        (4,'HR',400000),(5,'Finance',600000)])
    cur.executemany("INSERT INTO employees VALUES (?,?,?,?,?,?,?)", [
        (1,'Alice','Johnson',1,145000,'2020-03-15',None),(2,'Bob','Williams',1,120000,'2021-06-01',1),
        (3,'Carol','Davis',1,98000,'2022-01-10',1),(4,'David','Miller',2,89000,'2019-11-20',None),
        (5,'Eve','Wilson',2,72000,'2023-04-05',4),(6,'Frank','Moore',3,85000,'2021-09-12',None),
        (7,'Grace','Taylor',3,65000,'2022-07-18',6),(8,'Henry','Anderson',4,78000,'2020-08-22',None),
        (9,'Iris','Thomas',5,110000,'2018-12-03',None),(10,'Jack','Jackson',5,82000,'2023-01-15',9),
        (11,'Kate','Lee',1,130000,'2020-09-30',1),(12,'Leo','Martin',2,95000,'2021-02-14',4)])
    cur.executemany("INSERT INTO projects VALUES (?,?,?,?,?)", [
        (1,'Phoenix Platform',1,'active','2024-01-15'),(2,'Apollo API',1,'active','2024-03-01'),
        (3,'Q1 Sales Drive',2,'completed','2024-01-01'),(4,'Brand Refresh',3,'active','2024-02-10'),
        (5,'HRIS Migration',4,'planning','2024-05-01'),(6,'Budget Audit',5,'active','2024-04-12')])
    cur.executemany("INSERT INTO project_assignments VALUES (?,?,?,?)", [
        (1,1,1,30),(2,1,2,40),(3,1,3,35),(4,2,11,40),(5,2,3,15),
        (6,3,4,40),(7,3,5,40),(8,3,12,30),(9,4,6,35),(10,4,7,40),
        (11,5,8,25),(12,6,9,30),(13,6,10,40)])
    conn.commit()
    conn.close()


def init_demo_dbs():
    _seed_chinook()
    _seed_hr()


# Registry of database connections: id -> {name, url, type}
DB_REGISTRY: Dict[str, Dict[str, Any]] = {}


def register_demo_dbs():
    DB_REGISTRY["chinook"] = {
        "id": "chinook", "name": "Chinook (Music Store)", "type": "sqlite",
        "url": f"sqlite:///{CHINOOK_PATH}", "is_demo": True
    }
    DB_REGISTRY["hr"] = {
        "id": "hr", "name": "HR & Projects", "type": "sqlite",
        "url": f"sqlite:///{HR_PATH}", "is_demo": True
    }


def get_engine(db_id: str):
    info = DB_REGISTRY.get(db_id)
    if not info:
        raise ValueError(f"Unknown db id: {db_id}")
    return create_engine(info["url"])


def get_schema(db_id: str) -> Dict[str, Any]:
    """Return schema description for a database."""
    engine = get_engine(db_id)
    insp = inspect(engine)
    tables = []
    for tname in insp.get_table_names():
        cols = []
        for c in insp.get_columns(tname):
            cols.append({"name": c["name"], "type": str(c["type"])})
        fks = []
        for fk in insp.get_foreign_keys(tname):
            fks.append({
                "from": fk.get("constrained_columns", []),
                "to_table": fk.get("referred_table"),
                "to": fk.get("referred_columns", [])
            })
        try:
            with engine.connect() as conn:
                row_count = conn.execute(text(f"SELECT COUNT(*) FROM {tname}")).scalar()
        except Exception:
            row_count = None
        tables.append({"name": tname, "columns": cols, "foreign_keys": fks, "row_count": row_count})
    return {"db_id": db_id, "name": DB_REGISTRY[db_id]["name"], "type": DB_REGISTRY[db_id]["type"], "tables": tables}


def schema_to_prompt(schema: Dict[str, Any]) -> str:
    """Format schema as a compact string for LLM."""
    lines = [f"# Database: {schema['name']} ({schema['type']})"]
    for t in schema["tables"]:
        cols = ", ".join(f"{c['name']} {c['type']}" for c in t["columns"])
        lines.append(f"\nTABLE {t['name']} ({cols})")
        for fk in t["foreign_keys"]:
            lines.append(f"  FK {fk['from']} -> {fk['to_table']}.{fk['to']}")
    return "\n".join(lines)


def execute_sql(db_id: str, sql: str, limit: int = 200) -> Dict[str, Any]:
    """Execute a SELECT statement and return rows."""
    engine = get_engine(db_id)
    with engine.connect() as conn:
        result = conn.execute(text(sql))
        columns = list(result.keys())
        rows = []
        for i, row in enumerate(result):
            if i >= limit:
                break
            rows.append({col: (val if not hasattr(val, 'isoformat') else val.isoformat()) for col, val in zip(columns, row)})
    return {"columns": columns, "rows": rows, "row_count": len(rows)}


def add_connection(name: str, url: str, db_type: str) -> Dict[str, Any]:
    """Register a custom DB connection. Validates it can connect."""
    import uuid as _uuid
    db_id = f"custom_{_uuid.uuid4().hex[:8]}"
    try:
        eng = create_engine(url)
        with eng.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as e:
        raise ValueError(f"Connection failed: {e}")
    DB_REGISTRY[db_id] = {"id": db_id, "name": name, "type": db_type, "url": url, "is_demo": False}
    return {"id": db_id, "name": name, "type": db_type, "is_demo": False}


def list_databases() -> List[Dict[str, Any]]:
    return [{"id": v["id"], "name": v["name"], "type": v["type"], "is_demo": v["is_demo"]} for v in DB_REGISTRY.values()]
