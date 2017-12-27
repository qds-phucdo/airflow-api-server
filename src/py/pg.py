"""Database Processing"""

from datetime import datetime, timedelta
import urlparse
import pickle
import os
import psycopg2
import psycopg2.extras
urlparse.uses_netloc.append("postgres")
URL = urlparse.urlparse(os.environ["DATABASE_URL"])

import sys
import xmltodict
import urllib3

# Simple class to make sure we keep our PG tidy and cheap (for now)
class PGWriter():
    """Business Logical"""
    conn = None

    def __init__(self):
        self.conn = psycopg2.connect(
            database=URL.path[1:],
            user=URL.username,
            password=URL.password,
            host=URL.hostname,
            port=URL.port
        )

    def get_conn(self):
        """Connection"""
        self.conn.autocommit = True
        return self.conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    def execute(self, sql):
        """Execute sql string"""
        try:
            conn = self.get_conn()
            conn.execute(sql)
            conn.close()
            return True
        except:
            return False

    def fetch(self, sql):
        """Fetch"""
        try:
            conn = self.get_conn()
            conn.execute(sql)
            results = conn.fetchall()
            conn.close()
            return results
        except:
            return None

    def fetchone(self, sql):
        """Fetchone"""
        try:
            conn = self.get_conn()
            conn.execute(sql)
            results = conn.fetchone()
            conn.close()
            return results
        except:
            return None

    def set_connection_amazon_associates(self, params):
        query_get = """
            select
            * from public.dim_connections where provider_slug='{provider_slug}' and user_id={user_id}
        """.format(
            user_id=params['user_id'],
            provider_slug=params['provider_slug']
        )
        result = self.fetch(query_get)
        if len(result) == 0:
            query_set = """
            INSERT INTO public.dim_connections (user_id, connection_name, provider_slug) \
                VALUES({user_id}, '{connection_name}', '{provider_slug}');
            """.format(
                user_id=params['user_id'],
                connection_name=params['connection_name'],
                provider_slug=params['provider_slug']
            )
            self.execute(query_set)
            result = self.fetchone(query_get)
        return result

    def get_connection_amazon_associates(self, params):
        query_get = """
            select
            * from public.dim_connections where email='{email}'
        """.format(
            email=params['email']
        )
        result = self.fetchone(query_get)
        return result

    def update_security_code(self, params):
        query_set = """
            update public.dim_connections set security_code='{security_code}' where email='{email}'
        """.format(
            email=params['email'],
            security_code=params['security_code']
        )
        result = self.fetchone(query_set)
        return result
