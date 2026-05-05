"use client";

import {
  createContext,
  useContext,
  type ReactNode,
} from "react";
import { HelpCircle } from "@untitledui/icons";
import {
  Cell as AriaCell,
  Column as AriaColumn,
  Row as AriaRow,
  Table as AriaTable,
  TableBody as AriaTableBody,
  TableHeader as AriaTableHeader,
  type CellProps,
  type ColumnProps,
  type RowProps,
  type TableBodyProps,
  type TableHeaderProps,
  type TableProps,
} from "react-aria-components";
import { Badge } from "@/components/base/badges/badges";
import { Tooltip } from "@/components/base/tooltip/tooltip";
import { cx } from "@/utils/cx";

type Size = "sm" | "md";

const TableSizeContext = createContext<Size>("md");

const cellSizeStyles: Record<Size, string> = {
  sm: "px-4 py-2.5 text-xs",
  md: "px-6 py-3.5 text-sm",
};

const headSizeStyles: Record<Size, string> = {
  sm: "px-4 py-2 text-xs",
  md: "px-6 py-3 text-xs",
};

interface TableCardRootProps {
  size?: Size;
  className?: string;
  children?: ReactNode;
}

function TableCardRoot({ size = "md", className, children }: TableCardRootProps) {
  return (
    <TableSizeContext.Provider value={size}>
      <div
        className={cx(
          "relative flex flex-col overflow-hidden rounded-xl bg-bg-primary border border-border-secondary",
          className,
        )}
      >
        {children}
      </div>
    </TableSizeContext.Provider>
  );
}

interface TableCardHeaderProps {
  title: ReactNode;
  badge?: ReactNode;
  description?: ReactNode;
  contentTrailing?: ReactNode;
  className?: string;
}

function TableCardHeader({ title, badge, description, contentTrailing, className }: TableCardHeaderProps) {
  return (
    <div
      className={cx(
        "relative flex flex-col gap-1 border-b border-border-secondary px-4 py-4 md:flex-row md:items-center md:justify-between md:gap-4 md:px-6 md:py-5",
        className,
      )}
    >
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-text-primary md:text-lg">{title}</h3>
          {badge ? (
            typeof badge === "string" ? (
              <Badge size="sm" color="brand" type="pill-color">
                {badge}
              </Badge>
            ) : (
              badge
            )
          ) : null}
        </div>
        {description ? <p className="text-sm text-text-tertiary">{description}</p> : null}
      </div>
      {contentTrailing ? <div className="flex items-center gap-2">{contentTrailing}</div> : null}
    </div>
  );
}

export const TableCard = {
  Root: TableCardRoot,
  Header: TableCardHeader,
};

/* ---------------- Table primitives ---------------- */

type TableRootProps<T extends object = object> = TableProps & {
  size?: Size;
  className?: string;
  children?: ReactNode;
} & { items?: Iterable<T> };

function TableRoot({ size, className, children, ...rest }: TableRootProps) {
  const inheritedSize = useContext(TableSizeContext);
  const resolvedSize = size ?? inheritedSize;
  return (
    <TableSizeContext.Provider value={resolvedSize}>
      <div className="w-full overflow-x-auto">
        <AriaTable
          {...rest}
          className={cx("w-full border-collapse text-left", className)}
        >
          {children}
        </AriaTable>
      </div>
    </TableSizeContext.Provider>
  );
}

interface TableHeaderInnerProps<T extends object> extends Omit<TableHeaderProps<T>, "className"> {
  bordered?: boolean;
  className?: string;
  children?: ReactNode;
}

function TableHeader<T extends object>({ bordered = true, className, children, ...rest }: TableHeaderInnerProps<T>) {
  return (
    <AriaTableHeader
      {...(rest as TableHeaderProps<T>)}
      className={cx(
        "bg-bg-secondary",
        bordered && "border-b border-border-secondary",
        "[&>tr]:border-b [&>tr]:border-border-secondary",
        className,
      )}
    >
      {children}
    </AriaTableHeader>
  );
}

interface TableHeadProps extends Omit<ColumnProps, "children"> {
  label?: ReactNode;
  tooltip?: ReactNode;
  className?: string;
  children?: ReactNode;
}

function TableHead({ label, tooltip, className, children, ...rest }: TableHeadProps) {
  const size = useContext(TableSizeContext);
  const content = children ?? label;
  return (
    <AriaColumn
      {...rest}
      className={cx(
        "font-medium text-text-tertiary uppercase tracking-wide whitespace-nowrap",
        headSizeStyles[size],
        className,
      )}
    >
      <div className="flex items-center gap-1">
        <span>{content}</span>
        {tooltip ? (
          <Tooltip title={tooltip} placement="top">
            <button
              type="button"
              className="inline-flex items-center justify-center text-text-quaternary hover:text-text-tertiary outline-none"
              aria-label="Column info"
            >
              <HelpCircle className="h-3.5 w-3.5" />
            </button>
          </Tooltip>
        ) : null}
      </div>
    </AriaColumn>
  );
}

interface TableBodyInnerProps<T extends object> extends TableBodyProps<T> {
  className?: string;
}

function TableBody<T extends object>({ className, children, ...rest }: TableBodyInnerProps<T>) {
  return (
    <AriaTableBody
      {...(rest as TableBodyProps<T>)}
      className={cx("divide-y divide-border-secondary", className)}
    >
      {children}
    </AriaTableBody>
  );
}

interface TableRowInnerProps<T extends object> extends RowProps<T> {
  className?: string;
}

function TableRow<T extends object>({ className, children, ...rest }: TableRowInnerProps<T>) {
  return (
    <AriaRow
      {...(rest as RowProps<T>)}
      className={cx(
        "group/row outline-none",
        "data-[selected=true]:bg-bg-secondary",
        "data-[hovered=true]:bg-bg-secondary_hover",
        "data-[focus-visible=true]:ring-2 data-[focus-visible=true]:ring-focus-ring data-[focus-visible=true]:ring-inset",
        className,
      )}
    >
      {children as React.ReactNode}
    </AriaRow>
  );
}

interface TableCellInnerProps extends CellProps {
  className?: string;
}

function TableCell({ className, children, ...rest }: TableCellInnerProps) {
  const size = useContext(TableSizeContext);
  return (
    <AriaCell
      {...rest}
      className={cx("text-text-primary align-middle", cellSizeStyles[size], className)}
    >
      {children as React.ReactNode}
    </AriaCell>
  );
}

interface TableCompound {
  (props: TableRootProps): JSX.Element;
  Header: typeof TableHeader;
  Head: typeof TableHead;
  Body: typeof TableBody;
  Row: typeof TableRow;
  Cell: typeof TableCell;
}

const TableComponent = TableRoot as TableCompound;
TableComponent.Header = TableHeader;
TableComponent.Head = TableHead;
TableComponent.Body = TableBody;
TableComponent.Row = TableRow;
TableComponent.Cell = TableCell;

export const Table = TableComponent;
