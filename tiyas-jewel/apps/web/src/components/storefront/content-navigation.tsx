"use client";
import {createContext,useContext} from "react";
import type {NavigationContent} from "@tiyas/shared";
const NavigationContext=createContext<NavigationContent|null>(null);
export const useContentNavigation=()=>useContext(NavigationContext);
export function ContentNavigation({value,children}:{value:NavigationContent|null;children:React.ReactNode}) {return <NavigationContext value={value}>{children}</NavigationContext>;}
