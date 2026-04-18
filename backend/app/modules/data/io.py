"""
Excel and CSV I/O Utilities
Based on mergeexcel.py, apolloleadsmailbuilder.py, etc.
"""
import csv
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional, Union
import pandas as pd

logger = logging.getLogger(__name__)


class ExcelReader:
    """Read data from Excel files."""

    @staticmethod
    def read(
        file_path: str,
        sheet_name: Optional[str] = None,
        columns: Optional[List[str]] = None
    ) -> pd.DataFrame:
        """
        Read Excel file into DataFrame.

        Args:
            file_path: Path to Excel file
            sheet_name: Name of sheet to read (default: first sheet)
            columns: Optional list of columns to read

        Returns:
            DataFrame with the data
        """
        try:
            df = pd.read_excel(file_path, sheet_name=sheet_name or 0)

            # Normalize column names
            df.columns = df.columns.str.strip()

            # Filter to specific columns if requested
            if columns:
                missing = set(columns) - set(df.columns)
                if missing:
                    logger.warning(f"Columns not found in Excel: {missing}")
                df = df[[c for c in columns if c in df.columns]]

            return df

        except FileNotFoundError:
            logger.error(f"Excel file not found: {file_path}")
            raise
        except Exception as e:
            logger.error(f"Error reading Excel file: {e}")
            raise

    @staticmethod
    def read_multiple_sheets(
        file_path: str
    ) -> Dict[str, pd.DataFrame]:
        """Read all sheets from an Excel file."""
        try:
            return pd.read_excel(file_path, sheet_name=None)
        except Exception as e:
            logger.error(f"Error reading Excel sheets: {e}")
            raise


class ExcelWriter:
    """Write data to Excel files."""

    @staticmethod
    def write(
        df: pd.DataFrame,
        file_path: str,
        sheet_name: str = "Sheet1",
        append: bool = False
    ) -> bool:
        """
        Write DataFrame to Excel file.

        Args:
            df: DataFrame to write
            file_path: Output file path
            sheet_name: Sheet name
            append: If True and file exists, append to existing sheet

        Returns:
            True if successful
        """
        try:
            output_path = Path(file_path)
            output_path.parent.mkdir(parents=True, exist_ok=True)

            if append and output_path.exists():
                with pd.ExcelWriter(output_path, mode="a", engine="openpyxl", if_sheet_exists="replace") as writer:
                    df.to_excel(writer, sheet_name=sheet_name, index=False)
            else:
                df.to_excel(output_path, sheet_name=sheet_name, index=False)

            logger.info(f"Written {len(df)} rows to {file_path}")
            return True

        except Exception as e:
            logger.error(f"Error writing Excel file: {e}")
            return False

    @staticmethod
    def update_cells(
        file_path: str,
        updates: Dict[str, Dict[str, Any]],
        sheet_name: str = "Sheet1"
    ) -> bool:
        """
        Update specific cells in an Excel file.

        Args:
            file_path: Path to Excel file
            updates: Dict of {row_index: {col_name: value}}
            sheet_name: Sheet name

        Returns:
            True if successful
        """
        try:
            df = pd.read_excel(file_path, sheet_name=sheet_name)

            for row_idx, cell_updates in updates.items():
                for col_name, value in cell_updates.items():
                    if col_name in df.columns and row_idx < len(df):
                        df.at[row_idx, col_name] = value

            df.to_excel(file_path, sheet_name=sheet_name, index=False)
            return True

        except Exception as e:
            logger.error(f"Error updating Excel cells: {e}")
            return False


class CSVProcessor:
    """Process CSV files with chunked reading for large files."""

    @staticmethod
    def read(
        file_path: str,
        columns: Optional[List[str]] = None,
        encoding: str = "utf-8"
    ) -> pd.DataFrame:
        """Read CSV file."""
        try:
            df = pd.read_csv(file_path, encoding=encoding)

            if columns:
                df = df[[c for c in columns if c in df.columns]]

            return df

        except Exception as e:
            logger.error(f"Error reading CSV: {e}")
            raise

    @staticmethod
    def write(
        df: pd.DataFrame,
        file_path: str,
        append: bool = False
    ) -> bool:
        """Write DataFrame to CSV."""
        try:
            output_path = Path(file_path)
            output_path.parent.mkdir(parents=True, exist_ok=True)

            mode = "a" if append else "w"
            df.to_csv(output_path, mode=mode, index=False, encoding="utf-8")

            return True

        except Exception as e:
            logger.error(f"Error writing CSV: {e}")
            return False

    @staticmethod
    def process_in_chunks(
        file_path: str,
        chunk_size: int = 1000,
        processor=None
    ) -> pd.DataFrame:
        """
        Process large CSV files in chunks.

        Args:
            file_path: Path to CSV
            chunk_size: Rows per chunk
            processor: Callable that takes a DataFrame chunk

        Returns:
            Combined DataFrame of all processed chunks
        """
        results = []

        try:
            for chunk in pd.read_csv(file_path, chunksize=chunk_size):
                if processor:
                    chunk = processor(chunk)
                results.append(chunk)

            return pd.concat(results, ignore_index=True)

        except Exception as e:
            logger.error(f"Error processing CSV chunks: {e}")
            raise
