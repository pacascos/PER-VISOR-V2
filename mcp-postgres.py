#!/usr/bin/env python3
"""
MCP Server for PostgreSQL Natural Language Queries
Allows querying the PER exam database using natural language
"""

import asyncio
import sys
import json
import subprocess
from typing import Dict, Any, List

class PostgreSQLMCP:
    def __init__(self):
        self.db_config = {
            "container": "per_postgres",
            "user": "per_user", 
            "database": "per_exams"
        }
        
    def execute_query(self, query: str) -> Dict[str, Any]:
        """Execute SQL query through Docker"""
        try:
            cmd = [
                "docker", "exec", self.db_config["container"],
                "psql", "-U", self.db_config["user"], "-d", self.db_config["database"],
                "-c", query
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode == 0:
                return {
                    "success": True,
                    "data": result.stdout,
                    "query": query
                }
            else:
                return {
                    "success": False,
                    "error": result.stderr,
                    "query": query
                }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "query": query
            }
    
    def get_schema_info(self) -> Dict[str, Any]:
        """Get database schema information"""
        schema_query = """
        SELECT 
            table_name,
            column_name,
            data_type,
            is_nullable
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        ORDER BY table_name, ordinal_position;
        """
        return self.execute_query(schema_query)
    
    def get_table_counts(self) -> Dict[str, Any]:
        """Get row counts for all tables"""
        count_query = """
        SELECT 
            'exams' as tabla, COUNT(*) as registros FROM exams
        UNION ALL
        SELECT 
            'questions' as tabla, COUNT(*) as registros FROM questions
        UNION ALL
        SELECT 
            'answer_options' as tabla, COUNT(*) as registros FROM answer_options
        UNION ALL
        SELECT 
            'question_explanations' as tabla, COUNT(*) as registros FROM question_explanations;
        """
        return self.execute_query(count_query)
    
    def query_convocatorias(self) -> Dict[str, Any]:
        """Get all available convocatorias"""
        query = """
        SELECT DISTINCT convocatoria, COUNT(*) as preguntas
        FROM exams e
        JOIN questions q ON e.id = q.exam_id
        WHERE convocatoria IS NOT NULL
        GROUP BY convocatoria
        ORDER BY convocatoria DESC;
        """
        return self.execute_query(query)
    
    def query_temas(self) -> Dict[str, Any]:
        """Get all available topics/categories"""
        query = """
        SELECT categoria, COUNT(*) as preguntas
        FROM questions
        WHERE categoria IS NOT NULL
        GROUP BY categoria
        ORDER BY preguntas DESC;
        """
        return self.execute_query(query)
    
    def custom_query(self, sql: str) -> Dict[str, Any]:
        """Execute custom SQL query"""
        # Basic safety check - only allow SELECT queries
        sql_trimmed = sql.strip().upper()
        if not sql_trimmed.startswith('SELECT'):
            return {
                "success": False,
                "error": "Only SELECT queries are allowed",
                "query": sql
            }
        
        return self.execute_query(sql)

def main():
    """Main MCP server function"""
    mcp = PostgreSQLMCP()
    
    while True:
        try:
            line = input()
            if not line.strip():
                continue
                
            try:
                request = json.loads(line)
            except json.JSONDecodeError:
                continue
            
            method = request.get('method', '')
            params = request.get('params', {})
            
            response = {"jsonrpc": "2.0", "id": request.get('id')}
            
            if method == "list_tools":
                response["result"] = {
                    "tools": [
                        {
                            "name": "get_schema",
                            "description": "Get database schema information"
                        },
                        {
                            "name": "get_table_counts", 
                            "description": "Get row counts for all tables"
                        },
                        {
                            "name": "query_convocatorias",
                            "description": "Get all available exam convocatorias with question counts"
                        },
                        {
                            "name": "query_temas",
                            "description": "Get all question topics/categories with counts"
                        },
                        {
                            "name": "custom_query",
                            "description": "Execute custom SELECT query",
                            "inputSchema": {
                                "type": "object",
                                "properties": {
                                    "sql": {
                                        "type": "string",
                                        "description": "SQL SELECT query to execute"
                                    }
                                },
                                "required": ["sql"]
                            }
                        }
                    ]
                }
            
            elif method == "call_tool":
                tool_name = params.get('name')
                arguments = params.get('arguments', {})
                
                if tool_name == "get_schema":
                    result = mcp.get_schema_info()
                elif tool_name == "get_table_counts":
                    result = mcp.get_table_counts()
                elif tool_name == "query_convocatorias":
                    result = mcp.query_convocatorias()
                elif tool_name == "query_temas":
                    result = mcp.query_temas()
                elif tool_name == "custom_query":
                    sql = arguments.get('sql', '')
                    result = mcp.custom_query(sql)
                else:
                    result = {"success": False, "error": f"Unknown tool: {tool_name}"}
                
                response["result"] = {
                    "content": [
                        {
                            "type": "text",
                            "text": json.dumps(result, indent=2, ensure_ascii=False)
                        }
                    ]
                }
            
            print(json.dumps(response, ensure_ascii=False))
            
        except EOFError:
            break
        except KeyboardInterrupt:
            break
        except Exception as e:
            error_response = {
                "jsonrpc": "2.0",
                "id": request.get('id') if 'request' in locals() else None,
                "error": {
                    "code": -1,
                    "message": str(e)
                }
            }
            print(json.dumps(error_response, ensure_ascii=False))

if __name__ == "__main__":
    main()